const GETTEXT_DOMAIN = 'my-indicator-extension';

const { Clutter, GObject, St, Soup, GLib } = imports.gi;
const ByteArray = imports.byteArray;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const _ = ExtensionUtils.gettext;

const Mainloop = imports.mainloop;

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

            let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
            item.connect('activate', () => {
                Main.notify('' + Math.random());
            });
            this.menu.addMenuItem(item);

            this._refresh()
        }

        _format(seconds) {
            return new Date(seconds * 1000).toISOString().slice(11, 19);
        }

        _processData(data) {
            if (data instanceof Uint8Array) {
                data = ByteArray.toString(data);
            }

            if (!data || JSON.parse(data).length == 0) {
                return "No data from ActivityWatch";
            }

            data = JSON.parse(data).map(d => {
                return {
                    timestamp: new Date(d.timestamp),
                    duration: d.duration,
                    status: d.data.status
                }
            })

            data.sort((a, b) => a.timestamp - b.timestamp)

            let sum = data.filter(val => val.duration > 1)
                .reduce((acc, val) => {
                    let last = acc.pop()
                    if (last.timestamp.getTime() < val.timestamp.getTime()) {
                        return [...acc, last, val]
                    } else if (last.duration < val.duration && last.status == val.status) {
                        return [...acc, val]
                    } else {
                        return [...acc, last]
                    }
                }, data.slice(0, 1))
                .filter(val => val.status == 'not-afk')
                .reduce((acc, val) => acc + val.duration, 0)

            return sum
        }

        _get_timerange() {
            let now = Date.now()

            let start = new Date(now)
            start.setHours(0)
            start.setMinutes(0)
            start.setSeconds(0)
            start.setMilliseconds(0)

            let end = new Date(now)
            end.setHours(23)
            end.setMinutes(59)
            end.setSeconds(59)
            end.setMilliseconds(999)

            return [start, end]
        }

        _processWatchers(data) {
            if (data instanceof Uint8Array) {
                data = ByteArray.toString(data);
            }

            if (!data || JSON.parse(data).length == 0) {
                return "No data from ActivityWatch";
            }

            data = Object.values(JSON.parse(data))
                .filter(val => val.client == 'aw-watcher-afk')
            data.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated)) // in descending order

            return data[0].id
        }

        _getWatchers() {
            let session = new Soup.Session();

            let port = '5600'

            let uri = `http://localhost:${port}/api/0/buckets/`

            let _message = Soup.Message.new("GET", uri);

            session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {

                try {
                    let w = this._processWatchers(_httpSession.send_and_read_finish(_message).get_data());
                    console.log(w)
                    this.watcher = w
                }
                catch (e) {
                    console.warn(e)
                    _httpSession.abort();
                }
            });
        }

        _setText() {

            let session = new Soup.Session();

            let port = '5600'
            
            if(!this.watcher) {
                this._getWatchers()
                return
            }

            let watcher = GLib.Uri.escape_string(this.watcher, null, true);

            let [start, end] = this._get_timerange();

            let escaped_start = GLib.Uri.escape_string(start.toISOString(), null, true);
            let escaped_end = GLib.Uri.escape_string(end.toISOString(), null, true);

            let uri = `http://localhost:${port}/api/0/buckets/${watcher}/events?start=${escaped_start}&end=${escaped_end}&limit=-1`;

            let _message = Soup.Message.new("GET", uri);

            session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {

                try {
                    let data = this._processData(_httpSession.send_and_read_finish(_message).get_data());
                    this.label.set_text(this._format(data));
                }
                catch (e) {
                    console.warn(e)
                    _httpSession.abort();
                }
            });

        }

        _refresh() {
            const REFRESH_RATE = 3;

            this._setText();

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

        destroy() {
            this._removeTimeout();
            super.destroy();
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
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
