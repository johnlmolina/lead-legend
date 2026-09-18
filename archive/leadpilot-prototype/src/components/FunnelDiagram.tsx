const NODE_STYLE = "font-mono text-[13px] sm:text-sm tracking-widest uppercase";
const LINE_STYLE = "stroke-slate-600";

export function FunnelDiagram() {
  return (
    <svg
      viewBox="0 0 700 520"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      role="img"
      aria-label="Diagram: LeadPilot connects CRM, AI, and SMS into a lead database and phone calls, which feed a calendar that produces booked estimates."
    >
      {/* LeadPilot -> row 1 */}
      <line x1="350" y1="55" x2="350" y2="105" className={LINE_STYLE} strokeWidth="1.5" />
      {/* row1 bracket */}
      <line x1="150" y1="105" x2="550" y2="105" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="150" y1="105" x2="150" y2="200" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="350" y1="105" x2="350" y2="200" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="550" y1="105" x2="550" y2="200" className={LINE_STYLE} strokeWidth="1.5" />
      {/* row1 -> row2 bracket */}
      <line x1="150" y1="200" x2="550" y2="200" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="260" y1="200" x2="260" y2="255" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="470" y1="200" x2="470" y2="255" className={LINE_STYLE} strokeWidth="1.5" />
      {/* row2 -> bracket -> calendar */}
      <line x1="260" y1="310" x2="260" y2="345" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="470" y1="310" x2="470" y2="345" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="260" y1="345" x2="470" y2="345" className={LINE_STYLE} strokeWidth="1.5" />
      <line x1="365" y1="345" x2="365" y2="385" className={LINE_STYLE} strokeWidth="1.5" />
      {/* calendar -> booked estimate */}
      <line x1="365" y1="420" x2="365" y2="460" className={LINE_STYLE} strokeWidth="1.5" />

      <text x="350" y="35" textAnchor="middle" className={`${NODE_STYLE} fill-slate-100`}>
        LeadPilot
      </text>

      <text x="150" y="235" textAnchor="middle" className={`${NODE_STYLE} fill-slate-300`}>
        CRM
      </text>
      <text x="350" y="235" textAnchor="middle" className={`${NODE_STYLE} fill-slate-100`}>
        AI
      </text>
      <text x="550" y="235" textAnchor="middle" className={`${NODE_STYLE} fill-slate-300`}>
        SMS
      </text>

      <text x="260" y="290" textAnchor="middle" className={`${NODE_STYLE} fill-slate-300`}>
        Lead database
      </text>
      <text x="470" y="290" textAnchor="middle" className={`${NODE_STYLE} fill-slate-300`}>
        Phone call
      </text>

      <text x="365" y="375" textAnchor="middle" className={`${NODE_STYLE} fill-slate-300`}>
        Calendar
      </text>

      <text x="365" y="450" textAnchor="middle" className={`${NODE_STYLE} fill-white font-semibold`}>
        Booked estimate
      </text>
    </svg>
  );
}
