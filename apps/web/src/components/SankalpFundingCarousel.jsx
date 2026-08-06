import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { getContributionPolicy, getFundingNeed } from "../lib/sankalpFunding.js";

export function SankalpFundingCarousel({ formatMoney, onSelect, projects, selectedProjectId }) {
  const trackRef = useRef(null);
  const selectedIndex = Math.max(projects.findIndex((project) => project.id === selectedProjectId), 0);

  useEffect(() => {
    const track = trackRef.current;
    const card = track?.children[selectedIndex];
    if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedIndex]);

  function selectAt(index) {
    if (!projects.length) return;
    const nextIndex = (index + projects.length) % projects.length;
    onSelect(projects[nextIndex]);
  }

  return (
    <div className="sankalp-carousel" aria-label="Sankalp needing support">
      <div className="sankalp-carousel-heading">
        <div>
          <span className="recommendation-kicker">Recommended first</span>
          <strong>Closest to its funding goal</strong>
        </div>
        {projects.length > 1 ? (
          <div className="sankalp-carousel-controls">
            <button type="button" aria-label="Previous Sankalp" title="Previous Sankalp" onClick={() => selectAt(selectedIndex - 1)}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="Next Sankalp" title="Next Sankalp" onClick={() => selectAt(selectedIndex + 1)}>
              <ChevronRight size={20} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="sankalp-carousel-track" ref={trackRef}>
        {projects.map((project, index) => {
          const policy = getContributionPolicy(project);
          const isSelected = project.id === selectedProjectId;
          const isBlocked = Boolean(policy && policy.maxRupees <= 0);
          const progress = Math.max(0, Math.min(Number(project.fundingPercent || 0), 100));

          return (
            <button
              type="button"
              className={`sankalp-slide ${isSelected ? "active" : ""}`}
              key={project.id}
              onClick={() => onSelect(project)}
              aria-pressed={isSelected}
            >
              <div className="sankalp-slide-topline">
                <span>{index === 0 ? "Most ready" : `Option ${index + 1}`}</span>
                <strong>{progress}% funded</strong>
              </div>
              <h3>{project.title}</h3>
              <div className="sankalp-progress" aria-label={`${progress}% funded`}>
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="sankalp-slide-metrics">
                <span><strong>{formatMoney(getFundingNeed(project))}</strong> still needed</span>
                <span><Users size={16} /> {project.contributorCount || 0} contributors</span>
              </div>
              <small>
                {isBlocked
                  ? "Your individual limit is complete. Slide to support another Sankalp."
                  : `You can allocate up to ${formatMoney(policy?.maxRupees || getFundingNeed(project))}.`}
              </small>
            </button>
          );
        })}
      </div>

      {projects.length > 1 ? (
        <div className="sankalp-carousel-dots" aria-label={`Sankalp ${selectedIndex + 1} of ${projects.length}`}>
          {projects.map((project, index) => (
            <button
              type="button"
              key={project.id}
              className={index === selectedIndex ? "active" : ""}
              aria-label={`Show ${project.title}`}
              onClick={() => selectAt(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
