/* global imports */
/* eslint no-undef: "error" */

const {
  Clutter, GObject, St, Soup, GLib,
} = imports.gi;
const ByteArray = imports.byteArray;

function getLastWatcher(data) {
  if (data instanceof Uint8Array) {
    data = ByteArray.toString(data);
  }

  if (!data || JSON.parse(data).length === 0) {
    return 'No data from ActivityWatch';
  }

  data = Object.values(JSON.parse(data))
    .filter((val) => val.client === 'aw-watcher-afk');
  data.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated)); // in descending order

  return data[0].id;
}

function getWatcher(port, callback) {
  const session = new Soup.Session();

  const uri = `http://localhost:${port}/api/0/buckets/`;

  const _message = Soup.Message.new('GET', uri);

  session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {
    try {
      const w = getLastWatcher(_httpSession.send_and_read_finish(_message).get_data());
      callback(w);
    } catch (e) {
      console.warn(e);
      _httpSession.abort();
    }
  });
}

function processData(data) {
  if (data instanceof Uint8Array) {
    data = ByteArray.toString(data);
  }

  if (!data || JSON.parse(data).length === 0) {
    return 'No data from ActivityWatch';
  }

  data = JSON.parse(data).map((d) => ({
    timestamp: new Date(d.timestamp),
    duration: d.duration,
    status: d.data.status,
  }));

  data.sort((a, b) => a.timestamp - b.timestamp);

  const sum = data.filter((val) => val.duration > 1)
  // some events occurs more than one time
    .reduce((acc, val) => {
      const last = acc.pop();
      if (last.timestamp.getTime() < val.timestamp.getTime()) {
        return [...acc, last, val];
      } if (last.duration < val.duration && last.status === val.status) {
        return [...acc, val];
      }
      return [...acc, last];
    }, data.slice(0, 1))
    .filter((val) => val.status === 'not-afk')
    .reduce((acc, val) => acc + val.duration, 0);

  return sum;
}

function getActiveTime(port, watcher, start, end, callback) {
  const session = new Soup.Session();

  const escapedWatcher = GLib.Uri.escape_string(watcher, null, true);

  const escapedStart = GLib.Uri.escape_string(start.toISOString(), null, true);
  const escapedEnd = GLib.Uri.escape_string(end.toISOString(), null, true);

  const uri = `http://localhost:${port}/api/0/buckets/${escapedWatcher}/events?start=${escapedStart}&end=${escapedEnd}&limit=-1`;

  const _message = Soup.Message.new('GET', uri);

  session.send_and_read_async(_message, GLib.PRIORITY_DEFAULT, null, (_httpSession, _message) => {
    try {
      const data = processData(_httpSession.send_and_read_finish(_message).get_data());
      callback(data);
    } catch (e) {
      console.warn(e);
      _httpSession.abort();
    }
  });
}
