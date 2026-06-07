import { type ReactNode, type RefObject } from 'react';
import { View, PerspectiveCamera } from '@react-three/drei';

type Props = {
  trackRef: RefObject<HTMLElement>;
  children: ReactNode;
};

// Shared lighting + camera + transparent background for every project object.
// Each <View> is scissored into the bounding rect of `trackRef`.
export function ProjectView({ trackRef, children }: Props) {
  // drei's View types the track ref as MutableRefObject, but it just needs
  // .current to read at frame time; a plain RefObject is functionally equivalent.
  return (
    <View track={trackRef as unknown as React.MutableRefObject<HTMLElement>}>
      <PerspectiveCamera makeDefault position={[0, 0, 2.4]} fov={42} near={0.1} far={20} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 4]} intensity={0.85} color={'#fff3df'} />
      <directionalLight position={[-3, -1, 2]} intensity={0.2} color={'#c8862b'} />
      {children}
    </View>
  );
}
