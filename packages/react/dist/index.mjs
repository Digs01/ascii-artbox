"use client";
import je, { useState as Se, useRef as fr, useCallback as Q, useEffect as dr } from "react";
var ee = { exports: {} }, L = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ce;
function vr() {
  if (Ce) return L;
  Ce = 1;
  var P = je, R = Symbol.for("react.element"), S = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, b = P.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, T = { key: !0, ref: !0, __self: !0, __source: !0 };
  function O(E, l, y) {
    var s, h = {}, d = null, C = null;
    y !== void 0 && (d = "" + y), l.key !== void 0 && (d = "" + l.key), l.ref !== void 0 && (C = l.ref);
    for (s in l) m.call(l, s) && !T.hasOwnProperty(s) && (h[s] = l[s]);
    if (E && E.defaultProps) for (s in l = E.defaultProps, l) h[s] === void 0 && (h[s] = l[s]);
    return { $$typeof: R, type: E, key: d, ref: C, props: h, _owner: b.current };
  }
  return L.Fragment = S, L.jsx = O, L.jsxs = O, L;
}
var M = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var we;
function pr() {
  return we || (we = 1, process.env.NODE_ENV !== "production" && function() {
    var P = je, R = Symbol.for("react.element"), S = Symbol.for("react.portal"), m = Symbol.for("react.fragment"), b = Symbol.for("react.strict_mode"), T = Symbol.for("react.profiler"), O = Symbol.for("react.provider"), E = Symbol.for("react.context"), l = Symbol.for("react.forward_ref"), y = Symbol.for("react.suspense"), s = Symbol.for("react.suspense_list"), h = Symbol.for("react.memo"), d = Symbol.for("react.lazy"), C = Symbol.for("react.offscreen"), w = Symbol.iterator, A = "@@iterator";
    function $(e) {
      if (e === null || typeof e != "object")
        return null;
      var r = w && e[w] || e[A];
      return typeof r == "function" ? r : null;
    }
    var D = P.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function v(e) {
      {
        for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
          t[n - 1] = arguments[n];
        xe("error", e, t);
      }
    }
    function xe(e, r, t) {
      {
        var n = D.ReactDebugCurrentFrame, o = n.getStackAddendum();
        o !== "" && (r += "%s", t = t.concat([o]));
        var u = t.map(function(i) {
          return String(i);
        });
        u.unshift("Warning: " + r), Function.prototype.apply.call(console[e], console, u);
      }
    }
    var ke = !1, Ae = !1, De = !1, Ie = !1, Fe = !1, re;
    re = Symbol.for("react.module.reference");
    function $e(e) {
      return !!(typeof e == "string" || typeof e == "function" || e === m || e === T || Fe || e === b || e === y || e === s || Ie || e === C || ke || Ae || De || typeof e == "object" && e !== null && (e.$$typeof === d || e.$$typeof === h || e.$$typeof === O || e.$$typeof === E || e.$$typeof === l || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      e.$$typeof === re || e.getModuleId !== void 0));
    }
    function We(e, r, t) {
      var n = e.displayName;
      if (n)
        return n;
      var o = r.displayName || r.name || "";
      return o !== "" ? t + "(" + o + ")" : t;
    }
    function te(e) {
      return e.displayName || "Context";
    }
    function j(e) {
      if (e == null)
        return null;
      if (typeof e.tag == "number" && v("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof e == "function")
        return e.displayName || e.name || null;
      if (typeof e == "string")
        return e;
      switch (e) {
        case m:
          return "Fragment";
        case S:
          return "Portal";
        case T:
          return "Profiler";
        case b:
          return "StrictMode";
        case y:
          return "Suspense";
        case s:
          return "SuspenseList";
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case E:
            var r = e;
            return te(r) + ".Consumer";
          case O:
            var t = e;
            return te(t._context) + ".Provider";
          case l:
            return We(e, e.render, "ForwardRef");
          case h:
            var n = e.displayName || null;
            return n !== null ? n : j(e.type) || "Memo";
          case d: {
            var o = e, u = o._payload, i = o._init;
            try {
              return j(i(u));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var x = Object.assign, W = 0, ne, ae, ie, oe, ue, se, le;
    function ce() {
    }
    ce.__reactDisabledLog = !0;
    function Ye() {
      {
        if (W === 0) {
          ne = console.log, ae = console.info, ie = console.warn, oe = console.error, ue = console.group, se = console.groupCollapsed, le = console.groupEnd;
          var e = {
            configurable: !0,
            enumerable: !0,
            value: ce,
            writable: !0
          };
          Object.defineProperties(console, {
            info: e,
            log: e,
            warn: e,
            error: e,
            group: e,
            groupCollapsed: e,
            groupEnd: e
          });
        }
        W++;
      }
    }
    function Le() {
      {
        if (W--, W === 0) {
          var e = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: x({}, e, {
              value: ne
            }),
            info: x({}, e, {
              value: ae
            }),
            warn: x({}, e, {
              value: ie
            }),
            error: x({}, e, {
              value: oe
            }),
            group: x({}, e, {
              value: ue
            }),
            groupCollapsed: x({}, e, {
              value: se
            }),
            groupEnd: x({}, e, {
              value: le
            })
          });
        }
        W < 0 && v("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var J = D.ReactCurrentDispatcher, q;
    function V(e, r, t) {
      {
        if (q === void 0)
          try {
            throw Error();
          } catch (o) {
            var n = o.stack.trim().match(/\n( *(at )?)/);
            q = n && n[1] || "";
          }
        return `
` + q + e;
      }
    }
    var K = !1, U;
    {
      var Me = typeof WeakMap == "function" ? WeakMap : Map;
      U = new Me();
    }
    function fe(e, r) {
      if (!e || K)
        return "";
      {
        var t = U.get(e);
        if (t !== void 0)
          return t;
      }
      var n;
      K = !0;
      var o = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var u;
      u = J.current, J.current = null, Ye();
      try {
        if (r) {
          var i = function() {
            throw Error();
          };
          if (Object.defineProperty(i.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(i, []);
            } catch (g) {
              n = g;
            }
            Reflect.construct(e, [], i);
          } else {
            try {
              i.call();
            } catch (g) {
              n = g;
            }
            e.call(i.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (g) {
            n = g;
          }
          e();
        }
      } catch (g) {
        if (g && n && typeof g.stack == "string") {
          for (var a = g.stack.split(`
`), p = n.stack.split(`
`), c = a.length - 1, f = p.length - 1; c >= 1 && f >= 0 && a[c] !== p[f]; )
            f--;
          for (; c >= 1 && f >= 0; c--, f--)
            if (a[c] !== p[f]) {
              if (c !== 1 || f !== 1)
                do
                  if (c--, f--, f < 0 || a[c] !== p[f]) {
                    var _ = `
` + a[c].replace(" at new ", " at ");
                    return e.displayName && _.includes("<anonymous>") && (_ = _.replace("<anonymous>", e.displayName)), typeof e == "function" && U.set(e, _), _;
                  }
                while (c >= 1 && f >= 0);
              break;
            }
        }
      } finally {
        K = !1, J.current = u, Le(), Error.prepareStackTrace = o;
      }
      var F = e ? e.displayName || e.name : "", k = F ? V(F) : "";
      return typeof e == "function" && U.set(e, k), k;
    }
    function Ve(e, r, t) {
      return fe(e, !1);
    }
    function Ue(e) {
      var r = e.prototype;
      return !!(r && r.isReactComponent);
    }
    function N(e, r, t) {
      if (e == null)
        return "";
      if (typeof e == "function")
        return fe(e, Ue(e));
      if (typeof e == "string")
        return V(e);
      switch (e) {
        case y:
          return V("Suspense");
        case s:
          return V("SuspenseList");
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case l:
            return Ve(e.render);
          case h:
            return N(e.type, r, t);
          case d: {
            var n = e, o = n._payload, u = n._init;
            try {
              return N(u(o), r, t);
            } catch {
            }
          }
        }
      return "";
    }
    var Y = Object.prototype.hasOwnProperty, de = {}, ve = D.ReactDebugCurrentFrame;
    function B(e) {
      if (e) {
        var r = e._owner, t = N(e.type, e._source, r ? r.type : null);
        ve.setExtraStackFrame(t);
      } else
        ve.setExtraStackFrame(null);
    }
    function Ne(e, r, t, n, o) {
      {
        var u = Function.call.bind(Y);
        for (var i in e)
          if (u(e, i)) {
            var a = void 0;
            try {
              if (typeof e[i] != "function") {
                var p = Error((n || "React class") + ": " + t + " type `" + i + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof e[i] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw p.name = "Invariant Violation", p;
              }
              a = e[i](r, i, n, t, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (c) {
              a = c;
            }
            a && !(a instanceof Error) && (B(o), v("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", n || "React class", t, i, typeof a), B(null)), a instanceof Error && !(a.message in de) && (de[a.message] = !0, B(o), v("Failed %s type: %s", t, a.message), B(null));
          }
      }
    }
    var Be = Array.isArray;
    function G(e) {
      return Be(e);
    }
    function Je(e) {
      {
        var r = typeof Symbol == "function" && Symbol.toStringTag, t = r && e[Symbol.toStringTag] || e.constructor.name || "Object";
        return t;
      }
    }
    function qe(e) {
      try {
        return pe(e), !1;
      } catch {
        return !0;
      }
    }
    function pe(e) {
      return "" + e;
    }
    function ge(e) {
      if (qe(e))
        return v("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", Je(e)), pe(e);
    }
    var ye = D.ReactCurrentOwner, Ke = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, he, be;
    function Ge(e) {
      if (Y.call(e, "ref")) {
        var r = Object.getOwnPropertyDescriptor(e, "ref").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.ref !== void 0;
    }
    function He(e) {
      if (Y.call(e, "key")) {
        var r = Object.getOwnPropertyDescriptor(e, "key").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.key !== void 0;
    }
    function ze(e, r) {
      typeof e.ref == "string" && ye.current;
    }
    function Xe(e, r) {
      {
        var t = function() {
          he || (he = !0, v("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", r));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "key", {
          get: t,
          configurable: !0
        });
      }
    }
    function Ze(e, r) {
      {
        var t = function() {
          be || (be = !0, v("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", r));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "ref", {
          get: t,
          configurable: !0
        });
      }
    }
    var Qe = function(e, r, t, n, o, u, i) {
      var a = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: R,
        // Built-in properties that belong on the element
        type: e,
        key: r,
        ref: t,
        props: i,
        // Record the component responsible for creating this element.
        _owner: u
      };
      return a._store = {}, Object.defineProperty(a._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(a, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: n
      }), Object.defineProperty(a, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: o
      }), Object.freeze && (Object.freeze(a.props), Object.freeze(a)), a;
    };
    function er(e, r, t, n, o) {
      {
        var u, i = {}, a = null, p = null;
        t !== void 0 && (ge(t), a = "" + t), He(r) && (ge(r.key), a = "" + r.key), Ge(r) && (p = r.ref, ze(r, o));
        for (u in r)
          Y.call(r, u) && !Ke.hasOwnProperty(u) && (i[u] = r[u]);
        if (e && e.defaultProps) {
          var c = e.defaultProps;
          for (u in c)
            i[u] === void 0 && (i[u] = c[u]);
        }
        if (a || p) {
          var f = typeof e == "function" ? e.displayName || e.name || "Unknown" : e;
          a && Xe(i, f), p && Ze(i, f);
        }
        return Qe(e, a, p, o, n, ye.current, i);
      }
    }
    var H = D.ReactCurrentOwner, _e = D.ReactDebugCurrentFrame;
    function I(e) {
      if (e) {
        var r = e._owner, t = N(e.type, e._source, r ? r.type : null);
        _e.setExtraStackFrame(t);
      } else
        _e.setExtraStackFrame(null);
    }
    var z;
    z = !1;
    function X(e) {
      return typeof e == "object" && e !== null && e.$$typeof === R;
    }
    function Ee() {
      {
        if (H.current) {
          var e = j(H.current.type);
          if (e)
            return `

Check the render method of \`` + e + "`.";
        }
        return "";
      }
    }
    function rr(e) {
      return "";
    }
    var Re = {};
    function tr(e) {
      {
        var r = Ee();
        if (!r) {
          var t = typeof e == "string" ? e : e.displayName || e.name;
          t && (r = `

Check the top-level render call using <` + t + ">.");
        }
        return r;
      }
    }
    function me(e, r) {
      {
        if (!e._store || e._store.validated || e.key != null)
          return;
        e._store.validated = !0;
        var t = tr(r);
        if (Re[t])
          return;
        Re[t] = !0;
        var n = "";
        e && e._owner && e._owner !== H.current && (n = " It was passed a child from " + j(e._owner.type) + "."), I(e), v('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', t, n), I(null);
      }
    }
    function Te(e, r) {
      {
        if (typeof e != "object")
          return;
        if (G(e))
          for (var t = 0; t < e.length; t++) {
            var n = e[t];
            X(n) && me(n, r);
          }
        else if (X(e))
          e._store && (e._store.validated = !0);
        else if (e) {
          var o = $(e);
          if (typeof o == "function" && o !== e.entries)
            for (var u = o.call(e), i; !(i = u.next()).done; )
              X(i.value) && me(i.value, r);
        }
      }
    }
    function nr(e) {
      {
        var r = e.type;
        if (r == null || typeof r == "string")
          return;
        var t;
        if (typeof r == "function")
          t = r.propTypes;
        else if (typeof r == "object" && (r.$$typeof === l || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        r.$$typeof === h))
          t = r.propTypes;
        else
          return;
        if (t) {
          var n = j(r);
          Ne(t, e.props, "prop", n, e);
        } else if (r.PropTypes !== void 0 && !z) {
          z = !0;
          var o = j(r);
          v("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", o || "Unknown");
        }
        typeof r.getDefaultProps == "function" && !r.getDefaultProps.isReactClassApproved && v("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function ar(e) {
      {
        for (var r = Object.keys(e.props), t = 0; t < r.length; t++) {
          var n = r[t];
          if (n !== "children" && n !== "key") {
            I(e), v("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", n), I(null);
            break;
          }
        }
        e.ref !== null && (I(e), v("Invalid attribute `ref` supplied to `React.Fragment`."), I(null));
      }
    }
    var Oe = {};
    function Pe(e, r, t, n, o, u) {
      {
        var i = $e(e);
        if (!i) {
          var a = "";
          (e === void 0 || typeof e == "object" && e !== null && Object.keys(e).length === 0) && (a += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var p = rr();
          p ? a += p : a += Ee();
          var c;
          e === null ? c = "null" : G(e) ? c = "array" : e !== void 0 && e.$$typeof === R ? (c = "<" + (j(e.type) || "Unknown") + " />", a = " Did you accidentally export a JSX literal instead of a component?") : c = typeof e, v("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", c, a);
        }
        var f = er(e, r, t, o, u);
        if (f == null)
          return f;
        if (i) {
          var _ = r.children;
          if (_ !== void 0)
            if (n)
              if (G(_)) {
                for (var F = 0; F < _.length; F++)
                  Te(_[F], e);
                Object.freeze && Object.freeze(_);
              } else
                v("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              Te(_, e);
        }
        if (Y.call(r, "key")) {
          var k = j(e), g = Object.keys(r).filter(function(cr) {
            return cr !== "key";
          }), Z = g.length > 0 ? "{key: someKey, " + g.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Oe[k + Z]) {
            var lr = g.length > 0 ? "{" + g.join(": ..., ") + ": ...}" : "{}";
            v(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, Z, k, lr, k), Oe[k + Z] = !0;
          }
        }
        return e === m ? ar(f) : nr(f), f;
      }
    }
    function ir(e, r, t) {
      return Pe(e, r, t, !0);
    }
    function or(e, r, t) {
      return Pe(e, r, t, !1);
    }
    var ur = or, sr = ir;
    M.Fragment = m, M.jsx = ur, M.jsxs = sr;
  }()), M;
}
process.env.NODE_ENV === "production" ? ee.exports = vr() : ee.exports = pr();
var gr = ee.exports;
function yr({
  frames: P = [],
  fps: R = 12,
  loop: S = !0,
  autoPlay: m = !0,
  onFrame: b,
  onEnd: T
}) {
  const [O, E] = Se(0), [l, y] = Se(m), s = fr(null), h = Q(() => y(!0), []), d = Q(() => y(!1), []), C = Q(() => y((w) => !w), []);
  return dr(() => {
    if (!l) {
      s.current && (clearInterval(s.current), s.current = null);
      return;
    }
    const w = 1e3 / R;
    return s.current = setInterval(() => {
      E((A) => {
        const $ = A + 1;
        return $ >= P.length ? S ? (b && b(0), 0) : (y(!1), T && T(), A) : (b && b($), $);
      });
    }, w), () => {
      s.current && clearInterval(s.current);
    };
  }, [l, R, P.length, S, b, T]), {
    currentFrame: P[O] || "",
    currentIndex: O,
    isPlaying: l,
    start: h,
    stop: d,
    toggle: C
  };
}
const br = ({
  frames: P = [],
  fps: R,
  loop: S,
  autoPlay: m,
  onFrame: b,
  onEnd: T,
  color: O,
  backgroundColor: E,
  className: l,
  style: y,
  prefersReducedMotion: s = !1
}) => {
  const h = s ? !1 : m, { currentFrame: d, toggle: C } = yr({
    frames: P,
    fps: R,
    loop: S,
    autoPlay: h,
    onFrame: b,
    onEnd: T
  }), w = {
    fontFamily: "monospace",
    whiteSpace: "pre",
    lineHeight: "1em",
    overflow: "hidden",
    display: "inline-block",
    color: O || "inherit",
    backgroundColor: E || "transparent",
    ...y
  }, A = typeof d == "string" && (d.includes("<span") || d.includes("<div"));
  return /* @__PURE__ */ gr.jsx(
    "pre",
    {
      className: l,
      style: w,
      onClick: C,
      role: "img",
      "aria-label": "ASCII Animation",
      ...A ? { dangerouslySetInnerHTML: { __html: d } } : { children: d }
    }
  );
};
export {
  br as AsciiAnimation,
  yr as useAsciiPlayer
};
