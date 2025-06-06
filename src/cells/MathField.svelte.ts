import type MathFieldElement from "../MathField.svelte";

import { LatexParserWrapper } from "../parser/parserWrapper";
import type { Statement, FieldTypes, DataTableInfo } from "../parser/types";
import appState from "../stores.svelte";

function setParsePending(parsePending: boolean) {
  appState.parsePending = parsePending;
}

const parserWrapper = new LatexParserWrapper(setParsePending);

export class MathField {
  latex: string = $state();
  type: FieldTypes;
  id: number;
  static nextId = 0;
  parsePending = $state(true);
  parsingError = $state(true);
  parsingErrorMessage = $state("Invalid Syntax");
  statement: Statement | null = $state(null);
  element: MathFieldElement | null = null;
  pendingNewLatex = false;
  newLatex:string;

  constructor (latex = "", type: FieldTypes ="math") {
    this.latex = latex;
    this.type = type;
    this.id = MathField.nextId++;
  };

  setPendingLatex(): void {
    if (this.pendingNewLatex && this.element) {
      this.element.setLatex(this.newLatex, false);
      this.pendingNewLatex = false; // needed to prevent the unlikely scenario where an immediateUpdate leads to an infinite loop
    }
  }

  async parseLatex(latex: string, dataTableInfo?: DataTableInfo) {
    this.latex = latex;

    this.parsePending = true;
    const result = await parserWrapper.parseLatex(latex, this.id, this.type, dataTableInfo);
    this.parsePending = false;

    this.pendingNewLatex = result.pendingNewLatex;
    this.newLatex = result.newLatex;
    this.parsingError = result.parsingError;
    this.parsingErrorMessage = result.parsingErrorMessage;
    this.statement = result.statement;

    if (result.immediateUpdate && this.element) {
      let startingPosition = this.element.getMathField().position;
      this.setPendingLatex();
      if (startingPosition > this.element.getMathField().lastOffset) {
        startingPosition = this.element.getMathField().lastOffset;
      }
      this.element.getMathField().position = startingPosition;
    }
  }
}
