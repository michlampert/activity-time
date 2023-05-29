const { Clutter, GObject, St, Soup, GLib } = imports.gi;
const ByteArray = imports.byteArray;

function getLastWatcher(data) {
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

function getWatcher(port, callback) {
    let session = new Soup.Session();

    let uri = `http://localhost:${port}/api/0/buckets/`

    let _message = Soup.Message.new("GET", uri);

    session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {

        try {
            let w = getLastWatcher(_httpSession.send_and_read_finish(_message).get_data());
            console.log(w)
            callback(w);
        }
        catch (e) {
            console.warn(e)
            _httpSession.abort();
        }
    });
}

function processData(data) {
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
        // some events occurs more than one time
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

function getActiveTime(port, watcher, start, end, callback) {

    let session = new Soup.Session();

    let escaped_watcher = GLib.Uri.escape_string(watcher, null, true);

    let escaped_start = GLib.Uri.escape_string(start.toISOString(), null, true);
    let escaped_end = GLib.Uri.escape_string(end.toISOString(), null, true);

    let uri = `http://localhost:${port}/api/0/buckets/${escaped_watcher}/events?start=${escaped_start}&end=${escaped_end}&limit=-1`;

    let _message = Soup.Message.new("GET", uri);

    session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {

        try {
            let data = processData(_httpSession.send_and_read_finish(_message).get_data());
            callback(data)
        }
        catch (e) {
            console.warn(e)
            _httpSession.abort();
        }
    });

}