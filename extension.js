const GETTEXT_DOMAIN = 'my-indicator-extension';

const { Clutter, GObject, St, Soup, GLib, Gio } = imports.gi;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const CurrentExtension = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const { getWatcher, getActiveTime } = CurrentExtension.imports.api
const { format, getTimerange } = CurrentExtension.imports.utils

const Mainloop = imports.mainloop;

class CustomPopupMenu extends PopupMenu.PopupMenu {
    close() {
        super.close()
        this.removeAll()
    }
}

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, _('My Shiny Indicator'));

            this.box = new St.BoxLayout({
                x_align: Clutter.ActorAlign.FILL
            });

            this.add_child(this.box)

            this.label = (new St.Label({
                text: "dupa",
                y_align: Clutter.ActorAlign.CENTER
            }))

            this.box.add_child(this.label)

            this.box.add_child(new St.Icon({
                icon_name: 'document-open-recent-symbolic',
                style_class: 'system-status-icon',
                x_align: Clutter.ActorAlign.FILL,
            }));

            this.setMenu(
                new CustomPopupMenu(this.menu.sourceActor, 0.5, St.Side.TOP)
            )

            this.connect('button-press-event', (_a, event) => this._onClick(event));
        }

        _onClick(event) {
            let port = '5600'

            switch (event.get_button()) {
                case Clutter.BUTTON_PRIMARY:
                    GLib.spawn_command_line_async(`xdg-open 'http://127.0.0.1:${port}'`)
                    return Clutter.EVENT_STOP
                case Clutter.BUTTON_SECONDARY:
                    this._toggleMenu()
                    return Clutter.EVENT_STOP
            }
        }

        _toggleMenu() {
            this.menu.removeAll()
            let item = new PopupMenu.PopupMenuItem(_('Settings'));
            item.connect('activate', () => {
                Main.notify('' + Math.random());
            });
            this.menu.addMenuItem(item);
            this.menu.toggle()
        }

    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);

        this._refresh();
    }

    disable() {
        this._removeTimeout();
        this._indicator.destroy();
        this._indicator = null;
    }

    _updateText() {

        let port = '5600'

        if (!this.watcher) {
            getWatcher(port, w => this.watcher = w)
            return
        }

        let [start, end] = getTimerange();

        getActiveTime(port, this.watcher, start, end, sum => {
            this._indicator.label.set_text(format(sum))
        })

    }

    _refresh() {
        const REFRESH_RATE = 3;

        this._updateText();

        this._removeTimeout();
        this._timeout = Mainloop.timeout_add_seconds(REFRESH_RATE, this._refresh.bind(this));

        return true;
    }

    _removeTimeout() {
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
