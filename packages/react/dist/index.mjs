"use client";
import je, { useState as Ce, useRef as fr, useCallback as Q, useEffect as vr } from "react";
var ee = { exports: {} }, Y = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Se;
function dr() {
  if (Se) return Y;
  Se = 1;
  var P = je, R = Symbol.for("react.element"), C = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, h = P.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, T = { key: !0, ref: !0, __self: !0, __source: !0 };
  function O(E, l, g) {
    var s, y = {}, _ = null, S = null;
    g !== void 0 && (_ = "" + g), l.key !== void 0 && (_ = "" + l.key), l.ref !== void 0 && (S = l.ref);
    for (s in l) m.call(l, s) && !T.hasOwnProperty(s) && (y[s] = l[s]);
    if (E && E.defaultProps) for (s in l = E.defaultProps, l) y[s] === void 0 && (y[s] = l[s]);
    return { $$typeof: R, type: E, key: _, ref: S, props: y, _owner: h.current };
  }
  return Y.Fragment = C, Y.jsx = O, Y.jsxs = O, Y;
}
var L = {};
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
    var P = je, R = Symbol.for("react.element"), C = Symbol.for("react.portal"), m = Symbol.for("react.fragment"), h = Symbol.for("react.strict_mode"), T = Symbol.for("react.profiler"), O = Symbol.for("react.provider"), E = Symbol.for("react.context"), l = Symbol.for("react.forward_ref"), g = Symbol.for("react.suspense"), s = Symbol.for("react.suspense_list"), y = Symbol.for("react.memo"), _ = Symbol.for("react.lazy"), S = Symbol.for("react.offscreen"), w = Symbol.iterator, V = "@@iterator";
    function I(e) {
      if (e === null || typeof e != "object")
        return null;
      var r = w && e[w] || e[V];
      return typeof r == "function" ? r : null;
    }
    var A = P.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function v(e) {
      {
        for (var r = arguments.length, t = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++)
          t[n - 1] = arguments[n];
        xe("error", e, t);
      }
    }
    function xe(e, r, t) {
      {
        var n = A.ReactDebugCurrentFrame, o = n.getStackAddendum();
        o !== "" && (r += "%s", t = t.concat([o]));
        var u = t.map(function(i) {
          return String(i);
        });
        u.unshift("Warning: " + r), Function.prototype.apply.call(console[e], console, u);
      }
    }
    var ke = !1, Ae = !1, De = !1, Fe = !1, Ie = !1, re;
    re = Symbol.for("react.module.reference");
    function $e(e) {
      return !!(typeof e == "string" || typeof e == "function" || e === m || e === T || Ie || e === h || e === g || e === s || Fe || e === S || ke || Ae || De || typeof e == "object" && e !== null && (e.$$typeof === _ || e.$$typeof === y || e.$$typeof === O || e.$$typeof === E || e.$$typeof === l || // This needs to include all possible module reference object
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
        case C:
          return "Portal";
        case T:
          return "Profiler";
        case h:
          return "StrictMode";
        case g:
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
          case y:
            var n = e.displayName || null;
            return n !== null ? n : j(e.type) || "Memo";
          case _: {
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
    var x = Object.assign, $ = 0, ne, ae, ie, oe, ue, se, le;
    function ce() {
    }
    ce.__reactDisabledLog = !0;
    function Ye() {
      {
        if ($ === 0) {
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
        $++;
      }
    }
    function Le() {
      {
        if ($--, $ === 0) {
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
        $ < 0 && v("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var J = A.ReactCurrentDispatcher, q;
    function M(e, r, t) {
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
      var Ve = typeof WeakMap == "function" ? WeakMap : Map;
      U = new Ve();
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
            } catch (p) {
              n = p;
            }
            Reflect.construct(e, [], i);
          } else {
            try {
              i.call();
            } catch (p) {
              n = p;
            }
            e.call(i.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (p) {
            n = p;
          }
          e();
        }
      } catch (p) {
        if (p && n && typeof p.stack == "string") {
          for (var a = p.stack.split(`
`), d = n.stack.split(`
`), c = a.length - 1, f = d.length - 1; c >= 1 && f >= 0 && a[c] !== d[f]; )
            f--;
          for (; c >= 1 && f >= 0; c--, f--)
            if (a[c] !== d[f]) {
              if (c !== 1 || f !== 1)
                do
                  if (c--, f--, f < 0 || a[c] !== d[f]) {
                    var b = `
` + a[c].replace(" at new ", " at ");
                    return e.displayName && b.includes("<anonymous>") && (b = b.replace("<anonymous>", e.displayName)), typeof e == "function" && U.set(e, b), b;
                  }
                while (c >= 1 && f >= 0);
              break;
            }
        }
      } finally {
        K = !1, J.current = u, Le(), Error.prepareStackTrace = o;
      }
      var F = e ? e.displayName || e.name : "", k = F ? M(F) : "";
      return typeof e == "function" && U.set(e, k), k;
    }
    function Me(e, r, t) {
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
        return M(e);
      switch (e) {
        case g:
          return M("Suspense");
        case s:
          return M("SuspenseList");
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case l:
            return Me(e.render);
          case y:
            return N(e.type, r, t);
          case _: {
            var n = e, o = n._payload, u = n._init;
            try {
              return N(u(o), r, t);
            } catch {
            }
          }
        }
      return "";
    }
    var W = Object.prototype.hasOwnProperty, ve = {}, de = A.ReactDebugCurrentFrame;
    function B(e) {
      if (e) {
        var r = e._owner, t = N(e.type, e._source, r ? r.type : null);
        de.setExtraStackFrame(t);
      } else
        de.setExtraStackFrame(null);
    }
    function Ne(e, r, t, n, o) {
      {
        var u = Function.call.bind(W);
        for (var i in e)
          if (u(e, i)) {
            var a = void 0;
            try {
              if (typeof e[i] != "function") {
                var d = Error((n || "React class") + ": " + t + " type `" + i + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof e[i] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw d.name = "Invariant Violation", d;
              }
              a = e[i](r, i, n, t, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (c) {
              a = c;
            }
            a && !(a instanceof Error) && (B(o), v("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", n || "React class", t, i, typeof a), B(null)), a instanceof Error && !(a.message in ve) && (ve[a.message] = !0, B(o), v("Failed %s type: %s", t, a.message), B(null));
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
    var ye = A.ReactCurrentOwner, Ke = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, he, be;
    function Ge(e) {
      if (W.call(e, "ref")) {
        var r = Object.getOwnPropertyDescriptor(e, "ref").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.ref !== void 0;
    }
    function ze(e) {
      if (W.call(e, "key")) {
        var r = Object.getOwnPropertyDescriptor(e, "key").get;
        if (r && r.isReactWarning)
          return !1;
      }
      return e.key !== void 0;
    }
    function Xe(e, r) {
      typeof e.ref == "string" && ye.current;
    }
    function He(e, r) {
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
        var u, i = {}, a = null, d = null;
        t !== void 0 && (ge(t), a = "" + t), ze(r) && (ge(r.key), a = "" + r.key), Ge(r) && (d = r.ref, Xe(r, o));
        for (u in r)
          W.call(r, u) && !Ke.hasOwnProperty(u) && (i[u] = r[u]);
        if (e && e.defaultProps) {
          var c = e.defaultProps;
          for (u in c)
            i[u] === void 0 && (i[u] = c[u]);
        }
        if (a || d) {
          var f = typeof e == "function" ? e.displayName || e.name || "Unknown" : e;
          a && He(i, f), d && Ze(i, f);
        }
        return Qe(e, a, d, o, n, ye.current, i);
      }
    }
    var z = A.ReactCurrentOwner, Ee = A.ReactDebugCurrentFrame;
    function D(e) {
      if (e) {
        var r = e._owner, t = N(e.type, e._source, r ? r.type : null);
        Ee.setExtraStackFrame(t);
      } else
        Ee.setExtraStackFrame(null);
    }
    var X;
    X = !1;
    function H(e) {
      return typeof e == "object" && e !== null && e.$$typeof === R;
    }
    function _e() {
      {
        if (z.current) {
          var e = j(z.current.type);
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
        var r = _e();
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
        e && e._owner && e._owner !== z.current && (n = " It was passed a child from " + j(e._owner.type) + "."), D(e), v('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', t, n), D(null);
      }
    }
    function Te(e, r) {
      {
        if (typeof e != "object")
          return;
        if (G(e))
          for (var t = 0; t < e.length; t++) {
            var n = e[t];
            H(n) && me(n, r);
          }
        else if (H(e))
          e._store && (e._store.validated = !0);
        else if (e) {
          var o = I(e);
          if (typeof o == "function" && o !== e.entries)
            for (var u = o.call(e), i; !(i = u.next()).done; )
              H(i.value) && me(i.value, r);
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
        r.$$typeof === y))
          t = r.propTypes;
        else
          return;
        if (t) {
          var n = j(r);
          Ne(t, e.props, "prop", n, e);
        } else if (r.PropTypes !== void 0 && !X) {
          X = !0;
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
            D(e), v("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", n), D(null);
            break;
          }
        }
        e.ref !== null && (D(e), v("Invalid attribute `ref` supplied to `React.Fragment`."), D(null));
      }
    }
    var Oe = {};
    function Pe(e, r, t, n, o, u) {
      {
        var i = $e(e);
        if (!i) {
          var a = "";
          (e === void 0 || typeof e == "object" && e !== null && Object.keys(e).length === 0) && (a += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var d = rr();
          d ? a += d : a += _e();
          var c;
          e === null ? c = "null" : G(e) ? c = "array" : e !== void 0 && e.$$typeof === R ? (c = "<" + (j(e.type) || "Unknown") + " />", a = " Did you accidentally export a JSX literal instead of a component?") : c = typeof e, v("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", c, a);
        }
        var f = er(e, r, t, o, u);
        if (f == null)
          return f;
        if (i) {
          var b = r.children;
          if (b !== void 0)
            if (n)
              if (G(b)) {
                for (var F = 0; F < b.length; F++)
                  Te(b[F], e);
                Object.freeze && Object.freeze(b);
              } else
                v("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              Te(b, e);
        }
        if (W.call(r, "key")) {
          var k = j(e), p = Object.keys(r).filter(function(cr) {
            return cr !== "key";
          }), Z = p.length > 0 ? "{key: someKey, " + p.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Oe[k + Z]) {
            var lr = p.length > 0 ? "{" + p.join(": ..., ") + ": ...}" : "{}";
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
    L.Fragment = m, L.jsx = ur, L.jsxs = sr;
  }()), L;
}
process.env.NODE_ENV === "production" ? ee.exports = dr() : ee.exports = pr();
var gr = ee.exports;
function yr({
  frames: P = [],
  fps: R = 12,
  loop: C = !0,
  autoPlay: m = !0,
  onFrame: h,
  onEnd: T
}) {
  const [O, E] = Ce(0), [l, g] = Ce(m), s = fr(null), y = Q(() => g(!0), []), _ = Q(() => g(!1), []), S = Q(() => g((w) => !w), []);
  return vr(() => {
    if (!l) {
      s.current && (clearInterval(s.current), s.current = null);
      return;
    }
    const w = 1e3 / R;
    return s.current = setInterval(() => {
      E((V) => {
        const I = V + 1;
        return I >= P.length ? C ? (h && h(0), 0) : (g(!1), T && T(), V) : (h && h(I), I);
      });
    }, w), () => {
      s.current && clearInterval(s.current);
    };
  }, [l, R, P.length, C, h, T]), {
    currentFrame: P[O] || "",
    currentIndex: O,
    isPlaying: l,
    start: y,
    stop: _,
    toggle: S
  };
}
const br = ({
  frames: P = [],
  fps: R,
  loop: C,
  autoPlay: m,
  onFrame: h,
  onEnd: T,
  color: O,
  backgroundColor: E,
  className: l,
  style: g,
  prefersReducedMotion: s = !1
}) => {
  const y = s ? !1 : m, { currentFrame: _, toggle: S } = yr({
    frames: P,
    fps: R,
    loop: C,
    autoPlay: y,
    onFrame: h,
    onEnd: T
  }), w = {
    fontFamily: "monospace",
    whiteSpace: "pre",
    lineHeight: "1em",
    overflow: "hidden",
    display: "inline-block",
    color: O || "inherit",
    backgroundColor: E || "transparent",
    ...g
  };
  return /* @__PURE__ */ gr.jsx(
    "pre",
    {
      className: l,
      style: w,
      onClick: S,
      role: "img",
      "aria-label": "ASCII Animation",
      children: _
    }
  );
};
export {
  br as AsciiAnimation,
  yr as useAsciiPlayer
};
