import { Descendant, Text } from "slate";

export const serializeSlateToHtml = (node: Descendant) => {
  if (Text.isText(node)) {
    let string = node.text;
    if (node.bold) {
      string = `<strong>${string}</strong>`;
    } 
    if(node.italic) {
      string = `<em>${string}</em>`;
    }
    if (node.code) {
      string = `<code>${string}</code>`;
    }
    if (node.underline) {
      string = `<u>${string}</u>`;
    }
    return `<span>${string}</span>`;
  }

  const children: string = node.children
    .map((n) => serializeSlateToHtml(n))
    .join("");
  let style = '';

  if ("align" in node && node.align) {
    style = `text-align: ${node.align};`;
  }

  switch (node.type) {
    case "block-quote":
      return `<blockquote style="${style}"><p>${children}</p></blockquote>`;
    case "bulleted-list":
      return `<ul>${children}</ul>`;
    case "heading-one":
      return `<h1 style="${style}">${children}</h1>`;
    case "heading-two":
      return `<h2 style="${style}">${children}</h2>`;
    case "heading-three":
      return `<h3 style="${style}">${children}</h3>`;
    case "list-item":
      return `<li>${children}</li>`;
    case "numbered-list":
      return `<ol>${children}</ol>`;
    case "image":
      return `<div class="flex justify-center items-center py-5">
        <Image style="width: 600px; height: 350px; " src="${node.url}" alt="${node.alt}">${children}</Image>
      </div>`;
    case "heading-three":
      return `<h3 style="${style}">${children}</h3>`;
    case "link":
      return `<a href="${node.url}" target="_blank">${children}</a>`;
    default:
      return `<p style="${style}">${children}</p>`;
  }
};
