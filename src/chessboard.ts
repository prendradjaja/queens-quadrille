import { $ } from "./util";

export type Coordinates = [number, number];

export type Move = { start: Coordinates, end: Coordinates };

export type Position = PlacedPiece[];

export interface Piece {
  type: 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
  color: 'w' | 'b' | 'a' | 's' | 'p' | 'r' | 'o' | 'y' | 'g' | 'c' | 'n' | 'v';
}

export interface PlacedPiece extends Piece {
  coordinates: Coordinates;
}

export class Chessboard {
  private boardSize: number;

  private position: Position;

  private root: HTMLElement | undefined;
  private mainLayer!: HTMLElement;
  private coordinatesLayer!: HTMLElement;

  private squares: Partial<Record<string, HTMLElement>>;

  private currentDrag: undefined | {
    movingElement: HTMLElement,
    removeListeners: () => void,
  };

  private onPieceMove?: (move: Move) => void;
  private moveValidator?: (move: Move, board: Chessboard) => boolean;

  constructor(position: Position, selector: string, boardSize = 8) {
    const root = $(selector);
    if (!root) {
      throw new Error('Root element not found');
    }
    this.root = root as HTMLElement;
    this.boardSize = boardSize;
    this.squares = {};
    this.renderBoard();
    this.position = JSON.parse(JSON.stringify(position))
    this.renderPosition(this.position);
  }

  public setMoveValidator(moveValidator: (move: Move, board: Chessboard) => boolean): void {
    this.moveValidator = moveValidator;
  }

  public setMoveListener(onPieceMove: (move: Move) => void): void {
    this.onPieceMove = onPieceMove;
  }

  // Not compatible with chessboardjs
  public getAscii(): string {
    const grid: string[][] = [];
    for (let r = 0; r < this.boardSize; r++) {
      const row: string[] = [];
      grid.push(row);
      for (let c = 0; c < this.boardSize; c++) {
        row.push('.');
      }
    }

    for (let piece of this.position) {
      const [r, c] = piece.coordinates;
      console.log(JSON.stringify(piece));
      let pieceSymbol = piece.color === 'b' ? piece.type : piece.type.toUpperCase();
      grid[r][c] = pieceSymbol;
    }

    return grid.map(row => row.join(' ')).join('\n');
  }

  public move(move: Move): void {
    const isCastling = this.isCastling(move);

    const piece = this.removePiece(move.start)!;
    this.removePiece(move.end);
    this.position.push({
      ...piece,
      coordinates: move.end,
    });

    if (isCastling) {
      let startRow = move.start[0];
      let endRow = startRow;
      let startCol: number, endCol: number;
      if (move.end[1] === 2) {
        startCol = 0;
        endCol = 3;
      } else if (move.end[1] === 6) {
        startCol = 7;
        endCol = 5;
      } else {
        console.error('Unreachable case');
        return;
      }
      this.move({ start: [startRow, startCol], end: [endRow, endCol] });
      return;
    }

    this.renderPosition(this.position);
  }

  private renderBoard(): void {
    if (!this.root) {
      return;
    }

    this.root.classList.add('chessboard');

    // <div class="coordinates-layer" />
    this.coordinatesLayer = document.createElement('div');
    this.root.appendChild(this.coordinatesLayer);
    this.coordinatesLayer.classList.add('coordinates-layer');

    // <div class="main-layer">
    this.mainLayer = document.createElement('div');
    this.root.appendChild(this.mainLayer);
    this.mainLayer.classList.add('main-layer');
    this.mainLayer.style.gridTemplateColumns = `repeat(${this.boardSize}, var(--cell-size))`;

    //   <div class="square" />
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        const square = document.createElement('div');
        this.mainLayer.appendChild(square);
        const squareColor = (r + c) % 2 === 0 ? 'light' : 'dark';
        square.classList.add('square', squareColor);
        this.squares[`${r}-${c}`] = square;

        square.attributes['data-coordinates-r'] = r;
        square.attributes['data-coordinates-c'] = c;

        square.addEventListener('mousedown', (event) => this.onDragStart(event, [r, c]));
      }
    }
    // </div.main-layer>
  }

  private renderPosition(position: Position): void {
    if (!this.root) {
      return;
    }
    this.clearBoard(); // TODO Don't do clear-redraw, at least because any bug in the middle of it can leave the board blank
    for (let piece of position) {
      const squareEl = this.getSquareElement(piece.coordinates);
      squareEl.appendChild(createPieceImg(piece));
    }
  }

  private clearBoard(): void {
    for (let square of Object.values(this.squares)) {
      square!.innerHTML = '';
    }
  }

  private onDragStart(event: MouseEvent, square: Coordinates): void {
    event.preventDefault();
    if (!this.root) {
      return;
    }

    if (event.button !== 0 /* Left mouse button */) {
      return;
    }

    const piece = this.getPiece(square);
    if (!piece) {
      return;
    }

    // Update classes on existing elements
    {
      const squareElement = this.getSquareElement(square);
      squareElement.classList.add('is-being-dragged');

      this.root.classList.add('drag-mode');
    }

    // Add "moving piece" element
    const movingElement = createPieceImg(piece);
    document.body.appendChild(movingElement);
    movingElement.style.position = 'absolute';
    // movingElement.style.cursor = 'pointer';
    movingElement.style.pointerEvents = 'none';
    movingElement.style.width = '100px';
    movingElement.style.left = `${event.clientX - 50}px`;
    movingElement.style.top = `${event.clientY - 50}px`;

    // Listeners
    let removeListeners;
    {
      const mousemoveListener = event => this.onDrag(event);
      window.addEventListener('mousemove', mousemoveListener);

      const mouseupListener = () => this.onDragEnd(square);
      window.addEventListener('mouseup', mouseupListener);

      removeListeners = () => {
        window.removeEventListener('mousemove', mousemoveListener);
        window.removeEventListener('mouseup', mouseupListener);
      };
    }

    this.currentDrag = {
      movingElement,
      removeListeners,
    }
  }

  private onDrag(event: MouseEvent): void {
    if (!this.currentDrag) {
      return;
    }

    const { movingElement } = this.currentDrag;

    movingElement.style.left = `${event.clientX - 50}px`;
    movingElement.style.top = `${event.clientY - 50}px`;
  }

  private onDragEnd(square: Coordinates): void {
    if (!this.root) {
      return;
    }

    if (!this.currentDrag) {
      return;
    }

    const squareEl = this.getSquareElement(square);
    squareEl.classList.remove('is-being-dragged');

    this.root.classList.remove('drag-mode');

    this.currentDrag.movingElement.remove();

    this.currentDrag.removeListeners();

    const hoveredElement = $('.chessboard .square:hover');
    if (hoveredElement) {
      const r: number = +hoveredElement.attributes['data-coordinates-r'];
      const c: number = +hoveredElement.attributes['data-coordinates-c'];
      const move = { start: square, end: [r, c] as Coordinates };
      if (this.validateMove(move)) {
        this.move(move);
        this.onPieceMove && this.onPieceMove(move);
      }
    }

    this.currentDrag = undefined;
  }

  private validateMove(move: Move): boolean {
    if (!this.moveValidator) {
      return true;
    } else {
      return this.moveValidator(move, this);
    }
  }

  public getSquareElement(coordinates: Coordinates): HTMLElement {
    if (!this.root) {
      throw new Error('This Chessboard is headless!');
    }
    const [r, c] = coordinates;
    return this.squares[`${r}-${c}`]!;
  }

  public getPiece(square: Coordinates): PlacedPiece | undefined {
    return this.position.find(
      (piece: PlacedPiece) => piece.coordinates[0] === square[0] && piece.coordinates[1] === square[1]
    );
  }

  /**
   * Returns the removed piece, if any.
   */
  private removePiece(square: Coordinates): Piece | undefined {
    const index = this.position.findIndex(
      (piece: PlacedPiece) => piece.coordinates[0] === square[0] && piece.coordinates[1] === square[1]
    );

    if (index === -1) {
      return undefined;
    } else {
      const [placedPiece] = this.position.splice(index, 1);
      const { coordinates, ...piece } = placedPiece;
      return piece;
    }
  }

  private isCastling(move: Move) {
    const piece = this.getPiece(move.start);
    return (
      piece?.type === 'k' &&
      move.start[1] === 4 &&
      (move.end[1] === 2 || move.end[1] === 6)
    );
  }
}

function createPieceImg(piece: PlacedPiece): HTMLImageElement {
  const pieceEl = document.createElement('img');
  pieceEl.src = `./images/pieces/${piece.color}${piece.type}.svg`;
  pieceEl.draggable = false;
  return pieceEl;
}
