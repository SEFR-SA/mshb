interface Props {
    color?: string;
    className?: string;
}

const SwordBadge = ({ color, className = "h-4 w-4" }: Props) => {
    return (
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shapeRendering="crispEdges" className={className} style={{ color }}>

  {/* Base Layer */}
  <path d="M12 1h3v3h-3zM11 2h1v5h-1zM10 3h1v5h-1zM9 4h1v5h-1zM12 4h2v1h-2zM8 5h1v5h-1zM12 5h1v1h-1zM7 6h1v5h-1zM6 7h1v4h-1zM5 8h1v2h-1zM3 11h2v2h-2zM1 13h2v2h-2z" fill="currentColor" />

  {/* Layer 2 */}
  <path d="M11 0h5v1h-5zM10 1h2v1h-2zM15 1h1v4h-1zM9 2h2v1h-2zM8 3h2v1h-2zM7 4h2v1h-2zM14 4h1v2h-1zM6 5h2v1h-2zM13 5h1v2h-1zM0 6h4v1h-4zM5 6h2v1h-2zM12 6h1v2h-1zM0 7h1v3h-1zM3 7h3v1h-3zM11 7h1v2h-1zM3 8h2v3h-2zM10 8h1v2h-1zM1 9h2v1h-2zM9 9h1v2h-1zM2 10h1v3h-1zM5 10h1v4h-1zM8 10h1v3h-1zM6 11h2v2h-2zM0 12h2v1h-2zM9 12h1v4h-1zM0 13h1v3h-1zM3 13h2v1h-2zM6 13h1v3h-1zM3 14h1v2h-1zM1 15h2v1h-2zM7 15h2v1h-2z" fill="#111111" />

  {/* Layer 3 */}
  <path d="M1 7h2v2h-2zM7 13h2v2h-2z" fill="currentColor" />

  {/* Layer 4 */}
  <path d="M12 1h2v1h-2zM11 2h1v1h-1zM10 3h1v1h-1zM9 4h1v1h-1zM8 5h1v1h-1zM7 6h1v1h-1zM1 7h2v1h-2zM6 7h1v1h-1zM5 8h1v1h-1zM3 11h2v1h-2zM1 13h2v1h-2zM7 13h2v1h-2z" fill="rgba(255, 255, 255, 0.4)" />

  {/* Layer 5 */}
  <path d="M14 2h1v2h-1zM13 4h1v1h-1zM12 5h1v1h-1zM11 6h1v1h-1zM10 7h1v1h-1zM1 8h2v1h-2zM9 8h1v1h-1zM8 9h1v1h-1zM7 10h1v1h-1zM3 12h2v1h-2zM1 14h2v1h-2zM7 14h2v1h-2z" fill="rgba(0, 0, 0, 0.3)" />

</svg>
    );
};

export default SwordBadge;
