import React from 'react';

/**
 * Normalizes gap prop to CSS value.
 * Accepts numbers (4, 8, 12, 16, 20, 24, 32, 40) or explicit CSS strings.
 */
function getGapValue(gap) {
  if (gap === undefined || gap === null) return undefined;
  if (typeof gap === 'number') return `${gap}px`;
  return gap;
}

/**
 * Stack - Vertical flex layout primitive
 */
export const Stack = React.forwardRef(function Stack(
  {
    children,
    as: Component = 'div',
    gap = 16,
    align,
    justify,
    wrap,
    className = '',
    style = {},
    ...props
  },
  ref
) {
  const inlineStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: getGapValue(gap),
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? (wrap === true ? 'wrap' : wrap) : undefined,
    width: '100%',
    boxSizing: 'border-box',
    ...style
  };

  return (
    <Component ref={ref} className={`layout-stack ${className}`} style={inlineStyle} {...props}>
      {children}
    </Component>
  );
});

/**
 * Row - Horizontal flex layout primitive
 */
export const Row = React.forwardRef(function Row(
  {
    children,
    as: Component = 'div',
    gap = 12,
    align = 'center',
    justify,
    wrap = false,
    className = '',
    style = {},
    ...props
  },
  ref
) {
  const inlineStyle = {
    display: 'flex',
    flexDirection: 'row',
    gap: getGapValue(gap),
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? (wrap === true ? 'wrap' : wrap) : undefined,
    boxSizing: 'border-box',
    ...style
  };

  return (
    <Component ref={ref} className={`layout-row ${className}`} style={inlineStyle} {...props}>
      {children}
    </Component>
  );
});
