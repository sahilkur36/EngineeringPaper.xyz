import Quill, { Delta } from "quill";
import { BaseCell, type DatabaseTableCell } from "./BaseCell";
import { MathField } from "./MathField.svelte";
import type { Statement } from "../parser/types";

class TableRowLabelField {
  label: string = $state();;
  id: number;
  static nextId = 0;

  constructor (label = "") {
    this.label = label;
    this.id = TableRowLabelField.nextId++;
  }
}

export default class TableCell extends BaseCell {
  rowLabels: TableRowLabelField[] = $state();
  nextRowLabelId: number;
  parameterFields: MathField[] = $state();
  combinedFields: MathField[];
  nextParameterId: number;
  parameterUnitFields: MathField[] = $state();
  rhsFields: MathField[][] = $state();
  selectedRow: number = $state();
  hideUnselected: boolean = $state();
  rowDeltas: Delta[] = $state();
  richTextInstance: Quill | null;
  tableStatements: Statement[];

  constructor (arg?: DatabaseTableCell) {
    super("table", arg?.id);
    if (arg === undefined) {
      this.rowLabels = [new TableRowLabelField("Option 1"), new TableRowLabelField("Option 2")];
      this.nextRowLabelId = 3;
      this.parameterFields = [new MathField('Var1', 'parameter'), new MathField('Var2', 'parameter')];
      this.nextParameterId = 3;
      this.combinedFields = [new MathField(), new MathField()];
      this.parameterUnitFields = [new MathField('', 'units'), new MathField('', 'units')];
      this.rhsFields = [[new MathField('', 'expression'), new MathField('', 'expression')],
                        [new MathField('', 'expression'), new MathField('', 'expression')]];
      this.selectedRow = 0;
      this.hideUnselected = false;
      this.rowDeltas = [];
      this.richTextInstance = null;
      this.tableStatements = [];
    } else {
      this.rowLabels = arg.rowLabels.map((label) => new TableRowLabelField(label));
      this.nextRowLabelId = arg.nextRowLabelId;
      this.parameterFields = arg.parameterLatexs.map((latex) => new MathField(latex, 'parameter'));
      this.nextParameterId = arg.nextParameterId;
      this.combinedFields = arg.parameterLatexs.map((latex) => new MathField());
      this.parameterUnitFields = arg.parameterUnitLatexs.map((latex) => new MathField(latex, 'units'));
      this.rhsFields = arg.rhsLatexs.map((row) => row.map((latex) => new MathField(latex, 'expression')));
      this.selectedRow = arg.selectedRow;
      this.hideUnselected = arg.hideUnselected;
      this.rowDeltas = arg.rowJsons;
      this.richTextInstance = null;
      this.tableStatements = [];
    }
  }

  serialize(): DatabaseTableCell {
    return {
      type: "table",
      id: this.id,
      rowLabels: this.rowLabels.map((row) => row.label),
      nextRowLabelId: this.nextRowLabelId,
      parameterLatexs: this.parameterFields.map((field) => field.latex),
      nextParameterId: this.nextParameterId,
      parameterUnitLatexs: this.parameterUnitFields.map((parameter) => parameter.latex),
      rhsLatexs: this.rhsFields.map((row) => row.map((field) => field.latex)),
      selectedRow: this.selectedRow,
      hideUnselected: this.hideUnselected,
      rowJsons: this.rowDeltas
    };
  }

  get parsePending() {
    return this.parameterFields.reduce((accum, value) => accum || value.parsePending, false) ||
           this.parameterUnitFields.reduce((accum, value) => accum || value.parsePending, false) ||
           this.rhsFields.reduce((accum, row) => accum || row.reduce((rowAccum, value) => rowAccum || value.parsePending, false), false);
  }

  async parseUnitField (latex: string, column: number) {
    await this.parameterUnitFields[column].parseLatex(latex);

    const columnType = latex.replaceAll(/\\:?/g,'').trim() === "" ? "expression" : "number"; 

    // the presence or absence of units impacts the parsing of the rhs values so the current 
    // column of rhs values needs to be parsed again
    for ( const row of this.rhsFields) {
      row[column].type = columnType;
      await row[column].parseLatex(row[column].latex);
    }
  }

  
  async parseTableStatements() {
    const rowIndex = this.selectedRow;
    const newTableStatements: Statement[] = [];
  
    if (!(this.parameterFields.some(value => value.parsingError) ||
          this.parameterUnitFields.some(value => value.parsingError) ||
          this.rhsFields.reduce((accum, row) => accum || row.some(value => value.parsingError), false))) {
      for (let colIndex = 0; colIndex < this.parameterFields.length; colIndex++) {
        let combinedLatex: string;
        if (this.rhsFields[rowIndex][colIndex].latex.replaceAll(/\\:?/g,'').trim() !== "") {
          combinedLatex = this.parameterFields[colIndex].latex + "=" +
                          this.rhsFields[rowIndex][colIndex].latex +
                          this.parameterUnitFields[colIndex].latex;

          await this.combinedFields[colIndex].parseLatex(combinedLatex);
          newTableStatements.push(this.combinedFields[colIndex].statement);
        }
      }
    }

    this.tableStatements = newTableStatements;
  }

  addRowDocumentation() {
    this.rowDeltas = Array.from({length: this.rowLabels.length}, () => new Delta());
  }

  deleteRowDocumentation() {
    this.rowDeltas = [];
  }


  addRow() {
    const newRowId = this.nextRowLabelId++;
    this.rowLabels = [...this.rowLabels, new TableRowLabelField(`Option ${newRowId}`)];
    
    if (this.rowDeltas.length > 0) {
      this.rowDeltas = [...this.rowDeltas, new Delta()];
    }

    let columnType: "expression" | "number";
    let newRhsRow: MathField[] = []; 
    for (const unitField of this.parameterUnitFields) {
      columnType = unitField.latex.replaceAll(/\\:?/g,'').trim() === "" ? "expression" : "number";
      newRhsRow.push(new MathField('', columnType));
    }

    this.rhsFields = [...this.rhsFields, newRhsRow];
  }

  addColumn() {
    const newVarId = this.nextParameterId++;

    this.parameterUnitFields = [...this.parameterUnitFields, new MathField('', 'units')];
    const newVarName = `Var${newVarId}`;
    this.parameterFields = [...this.parameterFields, new MathField(newVarName, 'parameter')];

    this.combinedFields = [...this.combinedFields, new MathField()];

    this.rhsFields = this.rhsFields.map( row => [...row, new MathField('', 'expression')]);
  }

  deleteRow(rowIndex: number):boolean {
    this.rowLabels = [...this.rowLabels.slice(0,rowIndex),
                                    ...this.rowLabels.slice(rowIndex+1)];

    if (this.rowDeltas.length > 0) {
      this.rowDeltas = [...this.rowDeltas.slice(0,rowIndex),
                        ...this.rowDeltas.slice(rowIndex+1)];
    }
    
    this.rhsFields = [...this.rhsFields.slice(0,rowIndex), 
                      ...this.rhsFields.slice(rowIndex+1)];

    if (this.selectedRow >= rowIndex) {
      if (this.selectedRow !== 0) {
        this.selectedRow -= 1;
        return true
      }
    }

    return false
  }

  deleteColumn(colIndex: number) {
    this.parameterUnitFields = [...this.parameterUnitFields.slice(0,colIndex),
                                     ...this.parameterUnitFields.slice(colIndex+1)];

    this.parameterFields = [...this.parameterFields.slice(0,colIndex),
                                 ...this.parameterFields.slice(colIndex+1)];

    this.combinedFields = [...this.combinedFields.slice(0,colIndex),
                                ...this.combinedFields.slice(colIndex+1)];

    this.rhsFields = this.rhsFields.map( row => [...row.slice(0,colIndex), ...row.slice(colIndex+1)]);
  }

}