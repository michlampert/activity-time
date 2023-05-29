function format(seconds, showSeconds) {
  return new Date(seconds * 1000).toISOString().slice(11, showSeconds ? 19 : 16);
}

function getTimerange() {
  const now = Date.now();

  const start = new Date(now);
  start.setHours(0);
  start.setMinutes(0);
  start.setSeconds(0);
  start.setMilliseconds(0);

  const end = new Date(now);
  end.setHours(23);
  end.setMinutes(59);
  end.setSeconds(59);
  end.setMilliseconds(999);

  return [start, end];
}
