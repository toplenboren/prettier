"use strict";

const fromPairs = require("lodash/fromPairs");
const { isNonEmptyArray } = require("../common/util");
const getLast = require("../utils/get-last");
const NODES_KEYS = {
  attrs: true,
  children: true,
};

class Node {
  constructor(props = {}) {
    for (const [key, value] of Object.entries(props)) {
      if (key in NODES_KEYS) {
        this._setNodes(key, value);
      } else {
        this[key] = value;
      }
    }
  }

  _setNodes(key, nodes) {
    if (nodes !== this[key]) {
      this[key] = cloneAndUpdateNodes(nodes, this);
      if (key === "attrs") {
        setNonEnumerableProperties(this, {
          attrMap: fromPairs(
            this[key].map((attr) => [attr.fullName, attr.value])
          ),
        });
      }
    }
  }

  map(fn) {
    let newNode = null;

    for (const NODES_KEY in NODES_KEYS) {
      const nodes = this[NODES_KEY];
      if (nodes) {
        const mappedNodes = mapNodesIfChanged(nodes, (node) => node.map(fn));
        if (newNode !== nodes) {
          if (!newNode) {
            newNode = new Node();
          }
          newNode._setNodes(NODES_KEY, mappedNodes);
        }
      }
    }

    if (newNode) {
      for (const key in this) {
        if (!(key in NODES_KEYS)) {
          newNode[key] = this[key];
        }
      }
      const { index, siblings, prev, next, parent } = this;
      setNonEnumerableProperties(newNode, {
        index,
        siblings,
        prev,
        next,
        parent,
      });
    }

    return fn(newNode || this);
  }

  clone(overrides) {
    return new Node(overrides ? { ...this, ...overrides } : this);
  }

  get firstChild() {
    return isNonEmptyArray(this.children) ? this.children[0] : null;
  }

  get lastChild() {
    return isNonEmptyArray(this.children) ? getLast(this.children) : null;
  }

  // for element and attribute
  get rawName() {
    return this.hasExplicitNamespace ? this.fullName : this.name;
  }
  get fullName() {
    return this.namespace ? this.namespace + ":" + this.name : this.name;
  }
}

function mapNodesIfChanged(nodes, fn) {
  const newNodes = nodes.map(fn);
  return newNodes.some((newNode, index) => newNode !== nodes[index])
    ? newNodes
    : nodes;
}

function cloneAndUpdateNodes(nodes, parent) {
  const siblings = nodes.map((node) =>
    node instanceof Node ? node.clone() : new Node(node)
  );

  let prev = null;
  let current = siblings[0];
  let next = siblings[1] || null;

  for (let index = 0; index < siblings.length; index++) {
    setNonEnumerableProperties(current, {
      index,
      siblings,
      prev,
      next,
      parent,
    });
    prev = current;
    current = next;
    next = siblings[index + 2] || null;
  }

  return siblings;
}

function setNonEnumerableProperties(obj, props) {
  const descriptors = fromPairs(
    Object.entries(props).map(([key, value]) => [
      key,
      { value, enumerable: false },
    ])
  );

  Object.defineProperties(obj, descriptors);
}

module.exports = {
  Node,
};
