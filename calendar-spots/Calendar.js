// I would change moment to date-fns, to improve the performance and the bundle size.

// I would use es6 modules instead of commonjs, to avoid the use of require and module.exports. But Jest is a bit tricky to work with es6 modules.
const moment = require('moment');
const fs = require('fs');

class Calendar {
  getAvailableSpots (calendar, date, duration) {
    // I will not mess with refactoring the business logic , because I have no idea what should be.
    // I will just refactor the code to make it more readable and maintainable.
    const data = this._getCalendarData(calendar);

    const dateISO = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    const durationBefore = data.durationBefore;
    const durationAfter = data.durationAfter;
    const daySlots = this._createDaySlot(data.slots, date);
    const realSpots = this._createRealSpots(daySlots, date, dateISO, data);
    const arrSlot = this._createArrSlot(realSpots, dateISO, duration, durationBefore, durationAfter);
    return arrSlot;
  }

  _getCalendarPath (calendar) {
    return `./calendars/calendar.${calendar}.json`;
  }

  _getCalendarData (calendar) {
    // I would change the way to read the file, to use async/await, to avoid blocking the event loop.
    const rawData = fs.readFileSync(this._getCalendarPath(calendar));
    return JSON.parse(rawData);
  }

  _createDaySlot (slots, date) {
    let daySlots = [];
    for (const key in slots) {
      if (key === date) {
        daySlots = slots[key];
      }
    }
    return daySlots;
  }

  _createRealSpots (daySlots, date, dateISO, data) {
    const realSpots = [];
    for (const daySlot of daySlots) {
      if (data.sessions && data.sessions[date]) {
        let noConflicts = true;
        for (const sessionSlot of data.sessions[date]) {
          const sessionStart = moment(dateISO + ' ' + sessionSlot.start).valueOf();
          const sessionEnd = moment(dateISO + ' ' + sessionSlot.end).valueOf();
          const start = moment(dateISO + ' ' + daySlot.start).valueOf();
          const end = moment(dateISO + ' ' + daySlot.end).valueOf();
          if (sessionStart > start && sessionEnd < end) {
            realSpots.push({ start: daySlot.start, end: sessionSlot.start });
            realSpots.push({ start: sessionSlot.end, end: daySlot.end });
            noConflicts = false;
          } else if (sessionStart === start && sessionEnd < end) {
            realSpots.push({ start: sessionSlot.end, end: daySlot.end });
            noConflicts = false;
          } else if (sessionStart > start && sessionEnd === end) {
            realSpots.push({ start: daySlot.start, end: sessionSlot.start });
            noConflicts = false;
          } else if (sessionStart === start && sessionEnd === end) {
            noConflicts = false;
          }
        }
        if (noConflicts) {
          realSpots.push(daySlot);
        }
      } else {
        realSpots.push(daySlot);
      }
    }
    return realSpots;
  }

  _createArrSlot (realSpots, dateISO, duration, durationBefore, durationAfter) {
    const arrSlot = [];
    for (const slot of realSpots) {
      let start = slot.start;
      let resultSlot;
      do {
        resultSlot = this._getOneMiniSlot(start, slot.end, duration, dateISO, durationBefore, durationAfter);
        if (resultSlot) {
          arrSlot.push(resultSlot);
          start = moment.utc(resultSlot.endHour).format('HH:mm');
        }
      } while (resultSlot);
    }
    return arrSlot;
  }

  _getMomentHour (dateISO, hour) {
    return moment(dateISO + ' ' + hour);
  }

  _addMinutes (hour, minutes) {
    return moment(hour).add(minutes, 'minutes').format('HH:mm');
  }

  _getOneMiniSlot (startSlot, endSlot, duration, dateISO, durationBefore, durationAfter) {
    const startHourFirst = this._getMomentHour(dateISO, startSlot);

    const startHour = startHourFirst.format('HH:mm');
    const endHour = this._addMinutes(startHourFirst, durationBefore + duration + durationAfter);
    const clientStartHour = this._addMinutes(startHourFirst, durationBefore);
    const clientEndHour = this._addMinutes(startHourFirst, duration);

    if (moment.utc(endHour, 'HH:mm').valueOf() > moment.utc(endSlot, 'HH:mm').valueOf()) {
      return null;
    }
    const objSlot = {
      startHour: moment.utc(dateISO + ' ' + startHour).toDate(),
      endHour: moment.utc(dateISO + ' ' + endHour).toDate(),
      clientStartHour: moment.utc(dateISO + ' ' + clientStartHour).toDate(),
      clientEndHour: moment.utc(dateISO + ' ' + clientEndHour).toDate()
    };
    return objSlot;
  };
}

// export instance as singleton in order to not change the external api. Otherwise, we would have to change the require statement in the tests.
// Another option would be to create a static method getAvailableSpots as looks to be used in the tests `const result = Calendar.getAvailableSpots(1, '10-04-2023', 30)`

module.exports = new Calendar();
