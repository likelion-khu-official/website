// textarea에서 특정 문자 위치의 캐럿 픽셀 좌표(요소 기준). 보이지 않는 미러 div에
// 같은 스타일·같은 텍스트를 넣어 그 지점 span의 위치를 재는 표준 기법을 최소화한 것이다.
const MIRROR_PROPS = [
  'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust',
  'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent',
  'letterSpacing', 'wordSpacing', 'tabSize',
] as const;

export function getCaretCoordinates(
  element: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const computed = window.getComputedStyle(element);
  const div = document.createElement('div');
  const style = div.style;

  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  for (const prop of MIRROR_PROPS) {
    // CSSStyleDeclaration은 camelCase 인덱싱으로 읽고 쓸 수 있다(setProperty는 kebab만 받음).
    style[prop] = computed[prop];
  }

  div.textContent = element.value.slice(0, position);
  const span = document.createElement('span');
  // 남은 텍스트(최소 한 글자)를 넣어 줄바꿈·너비 계산이 실제와 같게 한다.
  span.textContent = element.value.slice(position) || '.';
  div.appendChild(span);
  document.body.appendChild(div);

  const top = span.offsetTop + (parseInt(computed.borderTopWidth, 10) || 0);
  const left = span.offsetLeft + (parseInt(computed.borderLeftWidth, 10) || 0);
  const height = parseInt(computed.lineHeight, 10) || parseInt(computed.fontSize, 10) || 16;

  document.body.removeChild(div);
  return { top, left, height };
}
