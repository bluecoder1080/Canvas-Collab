/** Short, URL-friendly room ids like "aB3xK9mQ2Z". */
import { customAlphabet } from "nanoid";
import { ROOM_ID_LENGTH } from "@repo/shared";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, ROOM_ID_LENGTH);

export function newRoomId() {
  return nanoid();
}
