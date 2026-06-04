/**
 * 跨页"返回原路径"的状态契约 —— 栈模型
 *
 * 旧实现：state.back = { url, label } 只能记录一层来源。
 * 三层跳转（A → B → C，C 返回到 B 后，B 的来源 A 信息丢失）会出错。
 *
 * 新实现：state.backStack = BackTarget[]  把来源历史存为一个栈。
 *   - 列表/起点页 → 详情：state = { backStack: [自己] }
 *   - 详情页转发：    → state = { backStack: [...当前栈, 自己] }
 *   - 详情页"返回"：弹出栈顶 → 跳那个 URL，并把余下的栈传过去
 *
 * 例：物品仓库 → 物品 A → KP X
 *   - A 的 state.backStack = [{/items, 物品仓库}]
 *   - X 的 state.backStack = [{/items, 物品仓库}, {/items/A, A名}]
 *   - X 点返回 → nav /items/A with { backStack:[{/items, 物品仓库}] }
 *   - A 点返回 → nav /items with { backStack:[] }  ✓
 *
 * 兼容：仍然识别老的 state.back = { url, label } —— 当作单元素栈处理。
 */
import { useLocation, type Location } from 'react-router-dom';

export type BackTarget = { url: string; label: string };

function readStack(loc: Location): BackTarget[] {
  const s = loc.state as { backStack?: BackTarget[]; back?: BackTarget } | null;
  if (Array.isArray(s?.backStack)) return s!.backStack as BackTarget[];
  // 兼容旧的单元素 state.back
  if (s?.back && typeof s.back === 'object' && typeof s.back.url === 'string') {
    return [s.back];
  }
  return [];
}

/** 当前栈的顶（用来渲染"返回 XXX"按钮） */
export function useBackNav(): BackTarget | null {
  const loc = useLocation();
  const stack = readStack(loc);
  return stack.length > 0 ? stack[stack.length - 1]! : null;
}

/** 完整栈（用来在跳转下一页时一起带过去） */
export function useBackStack(): BackTarget[] {
  const loc = useLocation();
  return readStack(loc);
}

/**
 * Link state 构造器：把当前页推进栈底，作为下一页的来源
 *
 *   <Link to={...} state={pushBack(stack, { url: thisPage, label: thisName })}/>
 */
export function pushBack(currentStack: BackTarget[], here: BackTarget) {
  return { backStack: [...currentStack, here] };
}

/**
 * 返回操作：弹出栈顶，返回 nav 用的 url + state
 * 栈为空时返回 null（页面应自行 fallback）
 */
export function popBack(currentStack: BackTarget[]):
  | { url: string; state: { backStack: BackTarget[] } }
  | null
{
  if (currentStack.length === 0) return null;
  const top = currentStack[currentStack.length - 1]!;
  const rest = currentStack.slice(0, -1);
  return { url: top.url, state: { backStack: rest } };
}

/** 起点页（列表页）方便构造：自身作为唯一元素的栈 */
export function backState(url: string, label: string) {
  return { backStack: [{ url, label }] };
}
