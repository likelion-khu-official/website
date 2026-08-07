/** 제목 등에서 대표 글자 하나를 뽑아 썸네일 대체용 모노그램으로 쓴다.
 *  이모지·서로게이트가 잘리지 않게 코드포인트 단위로 자른다. */
export function monogram(text: string): string {
  return [...text.trim()][0] ?? '·';
}
