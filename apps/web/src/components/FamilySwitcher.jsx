import { Building2, ChevronDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api.js";

export function FamilySwitcher() {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState([]);
  const selectedId = localStorage.getItem("nyasa_family_id") || "";

  useEffect(() => {
    apiGet("/families").then((response) => setMemberships(response.data || [])).catch(() => setMemberships([]));
  }, []);

  function selectFamily(event) {
    const membership = memberships.find((item) => item.familyId?._id === event.target.value);
    if (!membership) return;
    localStorage.setItem("nyasa_family_id", membership.familyId._id);
    window.dispatchEvent(new Event("nyasa-family-changed"));
    navigate("/dashboard");
    window.location.reload();
  }

  return (
    <div className="family-switcher">
      <Building2 size={17} />
      {memberships.length ? (
        <label>
          <span className="sr-only">Current family</span>
          <select value={selectedId || memberships[0]?.familyId?._id || ""} onChange={selectFamily}>
            {memberships.map((membership) => <option value={membership.familyId?._id} key={membership._id}>{membership.familyId?.name || "Family"}</option>)}
          </select>
          <ChevronDown size={14} />
        </label>
      ) : <span>No family selected</span>}
      <Link to="/families" title="Manage family spaces"><Plus size={16} /></Link>
    </div>
  );
}
