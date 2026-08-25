import { useState } from "react";

export function DashboardSidebar({ ariaLabel, groups, footer, compact = false }) {
  const [closed, setClosed] = useState(() => new Set());

  const toggle = id => setClosed(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <aside className={`dashboard-sidebar${compact ? " dashboard-sidebar-compact" : ""}`} aria-label={ariaLabel}>
      <div className="dashboard-sidebar-groups">
        {groups.map(group => {
          const isClosed = closed.has(group.id);
          return (
            <section className="dashboard-sidebar-group" key={group.id}>
              <button
                type="button"
                className="dashboard-sidebar-heading"
                aria-expanded={!isClosed}
                onClick={() => toggle(group.id)}
              >
                <span>{group.label}</span>
                <span aria-hidden="true">{isClosed ? "⌄" : "⌃"}</span>
              </button>
              {!isClosed && (
                <div className="dashboard-sidebar-items">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`dashboard-sidebar-item${item.active ? " active" : ""}`}
                      onClick={item.onClick}
                      disabled={item.disabled}
                      data-tour={item.tour}
                      data-tour-prof={item.teacherTour}
                      aria-current={item.active ? "page" : undefined}
                    >
                      {item.icon && <span className="dashboard-sidebar-icon" aria-hidden="true">{item.icon}</span>}
                      <span>{item.label}</span>
                      {item.badge != null && <span className="dashboard-sidebar-badge">{item.badge}</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      {footer && <div className="dashboard-sidebar-footer">{footer}</div>}
    </aside>
  );
}
