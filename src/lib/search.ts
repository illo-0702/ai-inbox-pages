// 통합 검색 함수
import type { TaskView, RelationshipSummary } from "@/lib/types";

export interface SearchResult {
  tasks: TaskView[];
  relationships: RelationshipSummary[];
  contacts: string[];
}

/**
 * 업무, 관계, 담당자를 통합 검색
 * 대상: 관계명, 담당자명, 업무명, 금액, 구조화된 필드
 * 결과: 업무/관계/담당자로 그룹화
 */
export function searchTasks(
  query: string,
  tasks: TaskView[],
  relationships: RelationshipSummary[]
): SearchResult {
  if (!query.trim()) {
    return { tasks: [], relationships: [], contacts: [] };
  }

  const lowerQuery = query.toLowerCase().trim();

  // 검색용 텍스트 정규화
  function normalize(text: string): string {
    return text.toLowerCase().trim();
  }

  // 업무 검색
  const matchedTasks = tasks.filter((task) => {
    const matchesTitle = normalize(task.title).includes(lowerQuery);
    const matchesRelation = normalize(task.relationshipName).includes(lowerQuery);
    const matchesAmount = task.amount ? task.amount.toString().includes(lowerQuery) : false;

    return matchesTitle || matchesRelation || matchesAmount;
  });

  // 관계 검색
  const matchedRelationships = relationships.filter((rel) => {
    const matchesName = normalize(rel.name).includes(lowerQuery);
    const matchesContact = rel.contacts.some((contact) => normalize(contact).includes(lowerQuery));

    return matchesName || matchesContact;
  });

  // 담당자 검색 (중복 제거)
  const allContacts = relationships.flatMap((rel) => rel.contacts);
  const matchedContacts = Array.from(new Set(
    allContacts.filter((contact) => normalize(contact).includes(lowerQuery))
  ));

  return {
    tasks: matchedTasks,
    relationships: matchedRelationships,
    contacts: matchedContacts,
  };
}

/**
 * 단순 텍스트 필터링 (제목, 관계명, 담당자명)
 */
export function filterTasksByText(
  tasks: TaskView[],
  query: string,
  relationships: RelationshipSummary[]
): TaskView[] {
  if (!query.trim()) return tasks;

  const lowerQuery = query.toLowerCase().trim();

  return tasks.filter((task) => {
    const matchesTitle = task.title.toLowerCase().includes(lowerQuery);
    const matchesRelation = task.relationshipName.toLowerCase().includes(lowerQuery);

    return matchesTitle || matchesRelation;
  });
}

/**
 * 금액으로 검색
 */
export function searchByAmount(tasks: TaskView[], amount: number): TaskView[] {
  return tasks.filter((task) => task.amount === amount);
}

/**
 * 관계명으로 검색
 */
export function searchByRelationship(tasks: TaskView[], relationshipId: string): TaskView[] {
  return tasks.filter((task) => task.relationshipId === relationshipId);
}

/**
 * 담당자명으로 검색
 */
export function searchByContact(
  tasks: TaskView[],
  contactName: string,
  relationships: RelationshipSummary[]
): TaskView[] {
  // 담당자가 속한 관계 찾기
  const relWithContact = relationships.find((rel) =>
    rel.contacts.some((c) => c.toLowerCase() === contactName.toLowerCase())
  );

  if (!relWithContact) return [];

  return tasks.filter((task) => task.relationshipId === relWithContact.id);
}

/**
 * 제목으로 검색
 */
export function searchByTitle(tasks: TaskView[], title: string): TaskView[] {
  const lowerTitle = title.toLowerCase();
  return tasks.filter((task) => task.title.toLowerCase().includes(lowerTitle));
}

/**
 * 검색 결과 하이라이트 (문자열에서 일치 부분 강조)
 */
export function highlightMatch(text: string, query: string): { before: string; match: string; after: string } {
  if (!query.trim()) {
    return { before: text, match: "", after: "" };
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return { before: text, match: "", after: "" };
  }

  return {
    before: text.substring(0, index),
    match: text.substring(index, index + query.length),
    after: text.substring(index + query.length),
  };
}
