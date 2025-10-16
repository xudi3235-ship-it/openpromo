import {
  Children,
  isValidElement,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { MediaSectionDialogs } from "./media-section-dialogs";

function MediaSectionRoot({ children }: PropsWithChildren) {
  const childArray = Children.toArray(children);
  const sectionChildren: ReactNode[] = [];
  const dialogChildren: ReactNode[] = [];

  childArray.forEach((child) => {
    if (isValidElement(child) && child.type === MediaSectionDialogs) {
      dialogChildren.push(child);
    } else {
      sectionChildren.push(child);
    }
  });

  return (
    <>
      <div className="space-y-4">{sectionChildren}</div>
      {dialogChildren}
    </>
  );
}

export { MediaSectionRoot };
