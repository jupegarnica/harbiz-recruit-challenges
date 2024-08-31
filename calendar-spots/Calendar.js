const moment = require('moment');
const fs = require('fs');

class Calendar {
  getAvailableSpots(calendar, date, duration) {
    const rawdata = fs.readFileSync(`./calendars/calendar.${calendar}.json`);
    const data = JSON.parse(rawdata);

    const dateISO = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    const durationBefore = data.durationBefore;
    const durationAfter = data.durationAfter;
    let daySlots = [];
    for (const key in data.slots) {
      if (key === date) {
        daySlots = data.slots[key];
      }
    }

    const realSpots = [];
    daySlots.forEach(daySlot => {
      if (data.sessions && data.sessions[date]) {
        let noConflicts = true;
        data.sessions[date].forEach(sessionSlot => {
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
        });
        if (noConflicts) {
          realSpots.push(daySlot);
        }
      } else {
        realSpots.push(daySlot);
      }
    });

    const arrSlot = [];
    realSpots.forEach(slot => {
      let init = 0;
      let startHour;
      let endHour;
      let clientStartHour;
      let clientEndHour;

      const getMomentHour = hour => moment(dateISO + ' ' + hour);
      const addMinutes = (hour, minutes) => moment(hour).add(minutes, 'minutes').format('HH:mm');
      const removeMinutes = (hour, minutes) => moment(hour).subtract(minutes, 'minutes').format('HH:mm');

      const getOneMiniSlot = (startSlot, endSlot) => {
        const startHourFirst = getMomentHour(startSlot);

        startHour = startHourFirst.format('HH:mm');
        endHour = addMinutes(startHourFirst, durationBefore + duration + durationAfter);
        clientStartHour = addMinutes(startHourFirst, durationBefore);
        clientEndHour = addMinutes(startHourFirst, duration);

        if (moment.utc(endHour, 'HH:mm').valueOf() > moment.utc(endSlot, 'HH:mm').valueOf()) {
          return null;
        }
        const objSlot = {
          startHour: moment.utc(dateISO + ' ' + startHour).toDate(),
          endHour: moment.utc(dateISO + ' ' + endHour).toDate(),
          clientStartHour: moment.utc(dateISO + ' ' + clientStartHour).toDate(),
          clientEndHour: moment.utc(dateISO + ' ' + clientEndHour).toDate()
        };
        init += 1;
        return objSlot;
      };

      let start = slot.start;
      let resultSlot;
      do {
        resultSlot = getOneMiniSlot(start, slot.end);
        if (resultSlot) {
          arrSlot.push(resultSlot);
          start = moment.utc(resultSlot.endHour).format('HH:mm');
        }
      } while (resultSlot);

      return arrSlot;
    });
    return arrSlot;
  }
}

module.exports = new Calendar();
