/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

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
    
    _setText() {
        let session = new Soup.Session();
        let params = {
            len: '20'
        }
        let _paramsHash = Soup.form_encode_hash(params);
        let _message = new Soup.Message({
            method: "GET",
            uri: GLib.Uri.parse('https://ciprand.p3p.repl.co/api?len=20&count=10', GLib.UriFlags.NONE),
        });

        session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {

            let _jsonString = _httpSession.send_and_read_finish(_message).get_data();
            if (_jsonString instanceof Uint8Array) {
                _jsonString = ByteArray.toString(_jsonString);
            }
            try {
                if (!_jsonString) {
                    throw new Error("No data in response body");
                }
                this.label.set_text(JSON.parse(_jsonString).Strings[0]);
            }
            catch (e) {
                _httpSession.abort();
                reject(e);
            }
        });
      
    }
    
    _refresh() {
		  const REFRESH_RATE = 1;
		  
		  this._setText();

		  this._removeTimeout();
		  this._timeout = Mainloop.timeout_add_seconds(REFRESH_RATE, this._refresh.bind(this));
		  
		  return true;
	  }
    
    _removeTimeout() {
		  if(this._timeout) {
			  Mainloop.source_remove(this._timeout);
			  this._timeout = null;
		  }
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
        this._indicator._removeTimeout();
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
