export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

export interface Program extends ASTNode {
  type: 'Program';
  classes: ClassDeclaration[];
}

export interface ClassDeclaration extends ASTNode {
  type: 'ClassDeclaration';
  name: string;
  methods: MethodDeclaration[];
  fields: FieldDeclaration[];
  annotations: Annotation[];
}

export interface MethodDeclaration extends ASTNode {
  type: 'MethodDeclaration';
  name: string;
  returnType: string;
  parameters: Parameter[];
  body: Statement[];
  modifiers: string[];
  annotations: Annotation[];
}

export interface FieldDeclaration extends ASTNode {
  type: 'FieldDeclaration';
  name: string;
  dataType: string;
  initializer?: Expression;
  modifiers: string[];
}

export interface Parameter extends ASTNode {
  type: 'Parameter';
  name: string;
  dataType: string;
}

export interface Annotation extends ASTNode {
  type: 'Annotation';
  name: string;
  parameters: { [key: string]: any };
}

export interface Statement extends ASTNode {}

export interface ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface VariableDeclaration extends Statement {
  type: 'VariableDeclaration';
  name: string;
  dataType: string;
  initializer?: Expression;
}

export interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
}

export interface WhileStatement extends Statement {
  type: 'WhileStatement';
  condition: Expression;
  body: Statement;
}

export interface ForStatement extends Statement {
  type: 'ForStatement';
  init?: Statement;
  condition?: Expression;
  update?: Expression;
  body: Statement;
}

export interface BlockStatement extends Statement {
  type: 'BlockStatement';
  statements: Statement[];
}

export interface ReturnStatement extends Statement {
  type: 'ReturnStatement';
  value?: Expression;
}

export interface Expression extends ASTNode {}

export interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  operand: Expression;
}

export interface AssignmentExpression extends Expression {
  type: 'AssignmentExpression';
  left: Expression;
  right: Expression;
}

export interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
}

export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

export interface Literal extends Expression {
  type: 'Literal';
  value: any;
  dataType: string;
}

export interface ArrayExpression extends Expression {
  type: 'ArrayExpression';
  elements: Expression[];
}

export interface NewExpression extends Expression {
  type: 'NewExpression';
  className: string;
  arguments: Expression[];
}