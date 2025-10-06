import React, { useRef, useState } from "react";
import { Gantt, Willow } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { parseExcelToTasks } from "./parseExcelToTasks"; // from above


export default function App() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      text: "Example Task",
      start: new Date(2024, 5, 11),
      end: new Date(2024, 5, 15),
      duration: 4,
      progress: 50,
      type: "task",
    },
  ]);

  const ganttRef = useRef(null);

  const links = [];
  const scales = [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    {
      unit: "week", step: 1, format: (start, end) => {
        const getWeekNumber = (date) => {
          const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = tempDate.getUTCDay() || 7; // Make Sunday = 7
          tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          return weekNo;
        };

        const week = getWeekNumber(start);
        return `${week}`;
      }
    },
    {
      unit: "week", step: 1, format: (start, end) => {
        const options = { month: "numeric", day: "numeric" };
        return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
      }
    },
  ];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await parseExcelToTasks(file);
    setTasks(parsed);
  };


  const handleExportImage = async () => {
    if (!ganttRef.current) return;

    const tableEl = ganttRef.current.querySelector(".wx-table-wrapper");
    const chartEl = ganttRef.current.querySelector(".wx-content.x2-1dzadpy");

    if (!tableEl || !chartEl) {
      alert("Elements not found yet!");
      return;
    }

    const originalScrollTop = chartEl.scrollTop;
    const originalScrollLeft = chartEl.scrollLeft;
    const originalWidth = chartEl.style.width;
    const originalHeight = chartEl.style.height;
    const originalOverflow = chartEl.style.overflow;

    const fullWidth = chartEl.scrollWidth;
    const fullHeight = chartEl.scrollHeight;

    chartEl.style.width = `${fullWidth}px`;
    chartEl.style.height = `${fullHeight}px`;
    chartEl.style.overflow = "visible";
    chartEl.scrollTop = 0;
    chartEl.scrollLeft = 0;

    const tableCanvas = await html2canvas(tableEl, { useCORS: true, scale: 2 });
    const chartCanvas = await html2canvas(chartEl, { useCORS: true, scale: 2 });

    chartEl.style.width = originalWidth;
    chartEl.style.height = originalHeight;
    chartEl.style.overflow = originalOverflow;
    chartEl.scrollTop = originalScrollTop;
    chartEl.scrollLeft = originalScrollLeft;


    const totalWidth = tableCanvas.width + chartCanvas.width;
    const totalHeight = Math.max(tableCanvas.height, chartCanvas.height);

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = totalWidth;
    finalCanvas.height = totalHeight;
    const ctx = finalCanvas.getContext("2d");

    ctx.drawImage(tableCanvas, 0, 0);
    ctx.drawImage(chartCanvas, tableCanvas.width, 0);

    const link = document.createElement("a");
    link.download = "gantt-full.png";
    link.href = finalCanvas.toDataURL("image/png");
    link.click();
  };


  return (
    <Willow>
      <div style={{ padding: "1rem", display: "flex", gap: "1rem" }}>
        <label
          style={{
            background: "#0078D7",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          📁 Upload Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>

        <button
          onClick={handleExportImage}
          style={{
            background: "#16a34a",
            color: "white",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          📸 Export Image
        </button>
      </div>

      <div
        ref={ganttRef}
        style={{
          height: "80vh",
          width: "100%",
          overflow: "auto",
          background: "white",
        }}
      >
        <Gantt tasks={tasks} links={links} scales={scales} readonly />
      </div>
    </Willow>
  );
}
