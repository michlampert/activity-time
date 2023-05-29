const GETTEXT_DOMAIN = 'activity-time-extension';

const { Adw, Gio, GLib, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

function init(meta) {
    ExtensionUtils.initTranslations(GETTEXT_DOMAIN)
}

function buildPrefsWidget() {
    const prefsWidget = new Gtk.Box();

    const label = new Gtk.Label({ label: `${Me.metadata.name}` });
    prefsWidget.append(label);

    return prefsWidget;
}

function _add_row(group, settings, widget) {
    const row = new Adw.ActionRow(settings);
    group.add(row);

    row.add_suffix(widget);
    row.activatable_widget = widget;
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.prefs");

    const page = new Adw.PreferencesPage();
    window.add(page);

    const group = new Adw.PreferencesGroup();
    page.add(group);

    const showIcon = new Gtk.Switch({
        active: settings.get_boolean('show-icon'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind('show-icon', showIcon, 'active', Gio.SettingsBindFlags.DEFAULT);

    this._add_row(
        group,
        { title: _('Show extension icon') },
        showIcon
    )

    const port = Gtk.SpinButton.new_with_range(0, 65535, 1)
    port.set_value(settings.get_int('port'))
    port.valign = Gtk.Align.CENTER
    settings.bind('port', port, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.connect('changed::port', (settings, key) => {
        row2.set_subtitle(_('ActivityWatch should be available under ') + " " + `localhost:${settings.get_int('port')}`);
    });

    this._add_row(
        group,
        {
            title: _('Select port'),
            subtitle: _('ActivityWatch should be available under') + `localhost:${settings.get_int('port')}`
        },
        port
    );

    const interval = Gtk.SpinButton.new_with_range(0, 65535, 1)
    interval.set_value(settings.get_int('refresh-time'))
    interval.valign = Gtk.Align.CENTER
    settings.bind('refresh-time', interval, 'value', Gio.SettingsBindFlags.DEFAULT);

    this._add_row(
        group,
        {
            title: _('Refresh rate [s]'),
            subtitle: _('Data will be refreshed once per each time interval')
        },
        interval,
    );

    const showSeconds = new Gtk.Switch({
        active: settings.get_boolean('show-seconds'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind('show-seconds', showSeconds, 'active', Gio.SettingsBindFlags.DEFAULT);

    this._add_row(
        group,
        {
            title: _('Show seconds'),
            subtitle: _('Keep in mind that even ActivityWatch refresh date each tens of seconds')
        },
        showSeconds
    )


    window._settings = settings;
}