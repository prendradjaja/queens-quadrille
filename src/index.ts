import { Move, Chessboard, Coordinates, PlacedPiece, Position, Piece } from "./chessboard";
import { $, shallowEquals, shuffleArray, randomChoice } from "./util";

function main() {
  let board: Chessboard;
  board = new Chessboard(makeStartingPosition(), '#my-board', 4);

  const goalSquares: Coordinates[] = [[0, 0], [0, 3], [3, 0], [3, 3]];
  for (let each of goalSquares) {
    board.getSquareElement(each).classList.add('unreached-goal');
  }

  let goalsReached = new Set();
  let alreadyAnnouncedWin = false;

  board.setMoveValidator(validateMove);

  board.setMoveListener(move => {
    if (
      board.getPiece(move.end)?.type === 'q'
      && goalSquares.some(square => shallowEquals(square, move.end))
    ) {
      board.getSquareElement(move.end).classList.add('reached-goal');
      goalsReached.add(JSON.stringify(move.end));
      if (goalsReached.size === goalSquares.length && !alreadyAnnouncedWin) {
        alreadyAnnouncedWin = true;
        $('.congratulations')?.classList.remove('hidden');
      }
    }
  });
}

function makeStartingPosition(): Position {
  const pieces: Piece[] = [
    { type: 'r', color: 'b' },
    { type: 'r', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'k', color: 'b' },
    { type: 'r', color: 'w' },
    { type: 'r', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'k', color: 'w' },
  ];
  const allSquares: Coordinates[] = [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3],
  ];
  const possibleQueenSquares = [
            [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3],
            [3, 1], [3, 2],
  ];
  const queenSquare = randomChoice(possibleQueenSquares);
  const result: Position = [
    {
      coordinates: queenSquare,
      type: 'q' as const,
      color: 'w' as const,
    },
  ];

  const remainingSquares = allSquares.filter(square => !shallowEquals(square, queenSquare));
  shuffleArray(remainingSquares);
  while (pieces.length) {
    const piece = pieces.pop()!;
    const coordinates = remainingSquares.pop();
    if (!coordinates) {
      throw new Error('coordinates is unexpectedly empty');
    }
    result.push({
      coordinates,
      ...piece,
    });
  }
  return result;
}

function validateMove(move: Move, board: Chessboard): boolean {
  const { start, end } = move;
  if (board.getPiece(end)) {
    return false;
  }

  const { type: pieceType } = board.getPiece(start)!;

  const allowedMoves: Record<string, string[]> = {};
  allowedMoves.r = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(x => x.toString());
  allowedMoves.b = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(x => x.toString());
  allowedMoves.n = [[1, 2], [-1, 2], [-1, -2], [1, -2], [2, 1], [-2, 1], [-2, -1], [2, -1]].map(x => x.toString());
  allowedMoves.k = [...allowedMoves.r, ...allowedMoves.b];
  allowedMoves.q = [...allowedMoves.k];

  const delta = [
    end[0] - start[0],
    end[1] - start[1],
  ].toString();

  return allowedMoves[pieceType].includes(delta);

  return true;
}

main();
