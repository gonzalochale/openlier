export const CAMEO_ANGLES = ["front", "left", "right", "up", "down"] as const;
export type CameoAngle = (typeof CAMEO_ANGLES)[number];

interface PoseAngles {
  pitch: number;
  yaw: number;
  roll: number;
}

const THRESHOLDS: Record<CameoAngle, (p: PoseAngles) => boolean> = {
  front: ({ pitch, yaw, roll }) =>
    Math.abs(yaw) < 4 && Math.abs(pitch) < 4 && Math.abs(roll) < 8,
  left: ({ pitch, yaw }) => yaw > 25 && Math.abs(pitch) < 15,
  right: ({ pitch, yaw }) => yaw < -25 && Math.abs(pitch) < 15,
  up: ({ pitch, yaw }) => pitch < -15 && Math.abs(yaw) < 20,
  down: ({ pitch, yaw }) => pitch > 15 && Math.abs(yaw) < 20,
};

export function checkAlignment(pose: PoseAngles, angle: CameoAngle): boolean {
  return THRESHOLDS[angle](pose);
}

export const HOLD_DURATION_MS = 1000;
