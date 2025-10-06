import * as XLSX from "xlsx";

export function parseExcelToTasks(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerIndex = rows.findIndex((r) => r.includes("Nummer på opgaven"));
      const dataRows = rows.slice(headerIndex + 1);

      const tasks = [];
      const dispToTask = {}; // map dispositionsnummer → task object

      const getParentId = (disp) => {
        if (!disp || !disp.includes(".")) return 0;
        const parentDisp = disp.split(".").slice(0, -1).join(".");
        return dispToTask[parentDisp]?.id || 0;
      };

      const excelDateToJSDateSafe = (serial) => {
        if (serial === null || serial === undefined || serial === "" || isNaN(serial)) return undefined;
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);

        const fractional_day = serial - Math.floor(serial) + 0.0000001;
        let total_seconds = Math.floor(86400 * fractional_day);

        const seconds = total_seconds % 60;
        total_seconds -= seconds;

        const hours = Math.floor(total_seconds / (60 * 60));
        const minutes = Math.floor(total_seconds / 60) % 60;

        return new Date(
          date_info.getFullYear(),
          date_info.getMonth(),
          date_info.getDate(),
          hours,
          minutes,
          seconds
        );
      };

      dataRows.forEach((row) => {
        const [nummer, disp, navn, assigned, start, end, ...rest] = row;
        if (!nummer || !navn) return;

        const id = Number(nummer);
        const parentId = getParentId(disp?.toString() ?? "");
        const parentTask = dispToTask[disp?.split(".").slice(0, -1).join(".")];

        let taskStart = excelDateToJSDateSafe(start);
        let taskEnd = excelDateToJSDateSafe(end);

        if (parentTask) {
          if (!taskStart) taskStart = parentTask.start;
          if (!taskEnd) taskEnd = new Date(parentTask.start.getTime() + 24 * 60 * 60 * 1000);
        }

        const task = {
          id,
          text: navn,
          start: taskStart,
          end: taskEnd,
          parent: parentId,
          type: "task",
        };

        tasks.push(task);
        if (disp) dispToTask[disp.toString()] = task;
      });

      resolve(tasks);
    };

    reader.readAsArrayBuffer(file);
  });
}
