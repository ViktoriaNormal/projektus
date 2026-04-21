/**
 * Базовая нормализация текста поиска:
 * - схлопывает любые пробельные последовательности в один пробел,
 * - обрезает пробелы по краям.
 *
 * Сам инпут поиска не трогаем — пользователь видит ровно то, что ввёл.
 */
export function normalizeSearchText(q: string): string {
  return q.replace(/\s+/g, ' ').trim();
}

/**
 * Нормализация запроса по пользователям: как `normalizeSearchText`,
 * плюс отбрасывает ведущий `@`, чтобы `@admin` и `admin` искались одинаково.
 */
export function normalizeSearchQuery(q: string): string {
  return normalizeSearchText(q).replace(/^@/, '').trim();
}
