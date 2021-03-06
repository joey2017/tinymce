/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import { Fun, Optional } from '@ephox/katamari';
import { Attribute, SelectorFind, SugarElement, TextContent } from '@ephox/sugar';

const isNotEmpty = function (val) {
  return val.length > 0;
};

const defaultToEmpty = function (str) {
  return str === undefined || str === null ? '' : str;
};

const noLink = function (editor) {
  const text = editor.selection.getContent({ format: 'text' });
  return {
    url: '',
    text,
    title: '',
    target: '',
    link: Optional.none()
  };
};

const fromLink = function (link) {
  const text = TextContent.get(link);
  const url = Attribute.get(link, 'href');
  const title = Attribute.get(link, 'title');
  const target = Attribute.get(link, 'target');
  return {
    url: defaultToEmpty(url),
    text: text !== url ? defaultToEmpty(text) : '',
    title: defaultToEmpty(title),
    target: defaultToEmpty(target),
    link: Optional.some(link)
  };
};

const getInfo = function (editor) {
  // TODO: Improve with more of tiny's link logic?
  return query(editor).fold(
    function () {
      return noLink(editor);
    },
    function (link) {
      return fromLink(link);
    }
  );
};

const wasSimple = function (link) {
  const prevHref = Attribute.get(link, 'href');
  const prevText = TextContent.get(link);
  return prevHref === prevText;
};

const getTextToApply = function (link, url, info) {
  return info.text.toOptional().filter(isNotEmpty).fold(function () {
    return wasSimple(link) ? Optional.some(url) : Optional.none();
  }, Optional.some);
};

const unlinkIfRequired = function (editor, info) {
  const activeLink = info.link.bind(Fun.identity);
  activeLink.each(function (_link) {
    editor.execCommand('unlink');
  });
};

const getAttrs = function (url, info) {
  const attrs: any = { };
  attrs.href = url;

  info.title.toOptional().filter(isNotEmpty).each(function (title) {
    attrs.title = title;
  });
  info.target.toOptional().filter(isNotEmpty).each(function (target) {
    attrs.target = target;
  });
  return attrs;
};

const applyInfo = function (editor, info) {
  info.url.toOptional().filter(isNotEmpty).fold(function () {
    // Unlink if there is something to unlink
    unlinkIfRequired(editor, info);
  }, function (url) {
    // We must have a non-empty URL to insert a link
    const attrs = getAttrs(url, info);

    const activeLink = info.link.bind(Fun.identity);
    activeLink.fold(function () {
      const text = info.text.toOptional().filter(isNotEmpty).getOr(url);
      editor.insertContent(editor.dom.createHTML('a', attrs, editor.dom.encode(text)));
    }, function (link) {
      const text = getTextToApply(link, url, info);
      Attribute.setAll(link, attrs);
      text.each(function (newText) {
        TextContent.set(link, newText);
      });
    });
  });
};

const query = function (editor) {
  const start = SugarElement.fromDom(editor.selection.getStart());
  return SelectorFind.closest(start, 'a');
};

export {
  getInfo,
  applyInfo,
  query
};
