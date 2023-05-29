function format(seconds) {
    return new Date(seconds * 1000).toISOString().slice(11, 19);
}


function getTimerange() {
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