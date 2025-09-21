// types/r3f.d.ts
import { JSX as ThreeJSX } from "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSX.IntrinsicElements {}
  }
}
