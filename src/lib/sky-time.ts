/**
 * How far the page's clock runs ahead of real time. The sky pushes it forward
 * while the visitor holds the pointer down; the clock in the footer reads it.
 */
export const skyTime = { offset: 0 };

export const skyNow = () => Date.now() + skyTime.offset;
