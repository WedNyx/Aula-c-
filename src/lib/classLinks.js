export const MAX_CLASS_LINKS = 20;

export function normalizeClassLinkUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return null;
    url.username = "";
    url.password = "";
    return url.href;
  } catch {
    return null;
  }
}

export function sanitizeClassLink(link) {
  const title = String(link?.title || "").trim().slice(0, 80);
  const url = normalizeClassLinkUrl(link?.url);
  if (!title || !url) return null;
  return {
    id: String(link?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title,
    url,
    description: String(link?.description || "").trim().slice(0, 160),
  };
}

export function classLinksFor(resourceLinks, turmaId) {
  const raw = resourceLinks && Array.isArray(resourceLinks[turmaId]) ? resourceLinks[turmaId] : [];
  return raw.map(sanitizeClassLink).filter(Boolean).slice(0, MAX_CLASS_LINKS);
}

export function addClassLink(resourceLinks, turmaId, link) {
  const clean = sanitizeClassLink(link);
  if (!clean) return { ok:false, error:"Informe um nome e um endereço completo começando com https://" };
  const current = classLinksFor(resourceLinks, turmaId);
  if (current.length >= MAX_CLASS_LINKS) return { ok:false, error:`Cada turma pode ter até ${MAX_CLASS_LINKS} sites.` };
  if (current.some(item => item.url === clean.url)) return { ok:false, error:"Esse site já foi liberado para esta turma." };
  return { ok:true, links:{ ...(resourceLinks || {}), [turmaId]:[...current, clean] }, link:clean };
}

export function removeClassLink(resourceLinks, turmaId, linkId) {
  return {
    ...(resourceLinks || {}),
    [turmaId]:classLinksFor(resourceLinks, turmaId).filter(link => link.id !== linkId),
  };
}
