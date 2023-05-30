/* global imports */
/* eslint no-undef: "error" */

const GETTEXT_DOMAIN = 'activity-time-extension';

const {
  Clutter, GObject, St, Soup, GLib, Gio,
} = imports.gi;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const CurrentExtension = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const { getWatcher, getActiveTime } = CurrentExtension.imports.api;
const { format, getTimerange } = CurrentExtension.imports.utils;

const Mainloop = imports.mainloop;

// when menu is empty, it won't be shown after click
class OneShotPopupMenu extends PopupMenu.PopupMenu {
  close() {
    super.close();
    this.removeAll();
  }
}

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init(settings) {
      super._init(0.0, '');

      this.settings = settings;

      this.box = new St.BoxLayout({
        x_align: Clutter.ActorAlign.FILL,
      });

      this.add_child(this.box);

      this.label = (new St.Label({
        text: '...',
        y_align: Clutter.ActorAlign.CENTER,
      }));

      this.box.add_child(this.label);

      this.icon = new St.Icon({
        icon_name: 'document-open-recent-symbolic',
        style_class: 'system-status-icon',
        x_align: Clutter.ActorAlign.FILL,
      });

      this.settings.bind('show-icon', this.icon, 'visible', Gio.SettingsBindFlags.DEFAULT);

      this.box.add_child(this.icon);

      this.setMenu(
        new OneShotPopupMenu(this.menu.sourceActor, 0.5, St.Side.TOP),
      );

      this.connect('button-press-event', (_a, event) => this._onClick(event));
    }

    _onClick(event) {
      switch (event.get_button()) {
        case Clutter.BUTTON_PRIMARY:
          GLib.spawn_command_line_async(`xdg-open 'http://127.0.0.1:${this.settings.get_int('port')}'`);
          return Clutter.EVENT_STOP;
        default:
          this._toggleMenu();
          return Clutter.EVENT_STOP;
      }
    }

    _toggleMenu() {
      this.menu.removeAll();
      this.menu.addMenuItem(new PopupMenu.PopupMenuItem('Activity time', {
        can_focus: false,
        hover: false,
        reactive: false,
      }));
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      const item = new PopupMenu.PopupMenuItem(_('Settings'));
      item.connect('activate', () => ExtensionUtils.openPrefs());
      this.menu.addMenuItem(item);
      this.menu.toggle();
    }
  },
);

class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    this.settings = ExtensionUtils.getSettings();

    this._indicator = new Indicator(this.settings);
    Main.panel.addToStatusArea(this._uuid, this._indicator);

    this._refresh();
  }

  disable() {
    this._removeTimeout();
    this._indicator.destroy();
    this._indicator = null;
  }

  _updateText() {
    const port = this.settings.get_int('port');

    if (!this.watcher) {
      getWatcher(port, (w) => { this.watcher = w; });
      return;
    }

    const [start, end] = getTimerange();

    getActiveTime(port, this.watcher, start, end, (sum) => {
      this._indicator.label.set_text(format(sum, this.settings.get_boolean('show-seconds')));
    });
  }

  _refresh() {
    this._updateText();

    this._removeTimeout();
    this._timeout = Mainloop.timeout_add_seconds(this.settings.get_int('refresh-time'), this._refresh.bind(this));

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
