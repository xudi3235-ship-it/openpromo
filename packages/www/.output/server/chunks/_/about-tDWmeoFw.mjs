import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return /* @__PURE__ */ jsxs(
    "button",
    {
      className: "increment",
      onClick: () => setCount(count + 1),
      type: "button",
      children: [
        "Clicks: ",
        count
      ]
    }
  );
}
const SplitComponent = function RouteComponent() {
  return /* @__PURE__ */ jsxs("main", { children: [
    /* @__PURE__ */ jsx("h1", { children: "About" }),
    /* @__PURE__ */ jsx(Counter, {})
  ] });
};

export { SplitComponent as component };
//# sourceMappingURL=about-tDWmeoFw.mjs.map
