export default function Footer() {
  return (
    <footer className="border-t border-[#ececec]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold">hazardlens</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-neutral-500">
              News-derived hazard event data. Source: GDELT 2.0 GKG.
              Sample dataset; extraction limits documented in the method section.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Built by Richardson Dackam</p>
            <p className="mt-1 flex gap-3 text-neutral-500">
              <a href="https://x.com/richardsondx" target="_blank" rel="noreferrer" className="text-[#2563eb] hover:underline">x.com/richardsondx</a>
              <a href="https://github.com/richardsondx" target="_blank" rel="noreferrer" className="text-[#2563eb] hover:underline">github.com/richardsondx</a>
            </p>
          </div>
        </div>
        <p className="mt-8 text-xs text-neutral-400">
          Code: MIT. GDELT data: per GDELT terms of use. Basemap &copy; OpenStreetMap contributors &copy; CARTO.
        </p>
      </div>
    </footer>
  );
}
