/**
 * Dummy module whose sole purpose is to make sure shadcn/ui’s peer
 * dependencies are present during the build. Importing this file in
 * `app/ClientLayout.tsx` guarantees the resolver can locate these modules.
 *
 * The imports are side-effect only; everything is tree-shaken away
 * if the corresponding components are not used.
 */

/* Theme switcher dependency */
import "next-themes"

/* Radix primitives used by shadcn/ui */
import "@radix-ui/react-checkbox"
import "@radix-ui/react-radio-group"
import "@radix-ui/react-select"
