import { EditingState } from '../../types.js';
import { createArrowAnchorData, resolveArrowParameters } from '../types/arrowModel.js';

const contentOfArrow = arrow => ({
    id: arrow.id,
    name: arrow.arrowName,
    anchors: arrow.savedAnchors.map(createArrowAnchorData),
    parameters: resolveArrowParameters(arrow.arrowParameters),
});

/** Compare editable content, independent of selection, history and map navigation. */
export function getProjectContentSignature(editor, template) {
    const arrows = editor.arrows.map(contentOfArrow);
    let draft = null;
    if (editor.editingState === EditingState.EditingSelected) {
        arrows.push(contentOfArrow({
            id: editor.selectedArrow.id, arrowName: editor.name,
            savedAnchors: editor.anchors, arrowParameters: editor.parameters,
        }));
    } else if (editor.editingState === EditingState.DrawingNew) {
        draft = contentOfArrow({
            id: 'draft', arrowName: editor.name,
            savedAnchors: editor.anchors, arrowParameters: editor.parameters,
        });
    }
    arrows.sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify({ arrows, draft, template });
}
