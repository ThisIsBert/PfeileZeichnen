export var EditingState;
(function (EditingState) {
    EditingState[EditingState["Idle"] = 0] = "Idle";
    EditingState[EditingState["DrawingNew"] = 1] = "DrawingNew";
    EditingState[EditingState["EditingSelected"] = 2] = "EditingSelected";
})(EditingState || (EditingState = {}));
