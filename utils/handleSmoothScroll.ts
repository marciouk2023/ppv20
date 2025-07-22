export function handleSmoothScroll(
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
): void {
    e.preventDefault();
    const targetId = href.replace("#", "");
    const element = document.getElementById(targetId);
    if (element) {
        element.scrollIntoView({ behavior: "smooth" });
    }
}