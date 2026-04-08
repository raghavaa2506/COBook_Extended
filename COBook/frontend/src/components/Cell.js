// frontend/src/components/Cell.js (unchanged - already correct)
import React from 'react';
import CodeCell from './CodeCell';
import TextCell from './TextCell';

const Cell = ({
  cell,
  index,
  onUpdateContent,
  onRunCell,
  onDeleteCell,
  onAddCell,
  onShowAIAssistant,
  onToggleVisualization,
  onProvideInput,
  comments,
  onToggleComments,
  onAddComment
}) => {
  if (cell.type === 'code') {
    return (
      <CodeCell
        cell={cell}
        index={index}
        onUpdateContent={onUpdateContent}
        onRunCell={onRunCell}
        onDeleteCell={onDeleteCell}
        onAddCell={onAddCell}
        onShowAIAssistant={onShowAIAssistant}
        onToggleVisualization={onToggleVisualization}
        onProvideInput={onProvideInput}
      />
    );
  } else {
    return (
      <TextCell
        cell={cell}
        index={index}
        onUpdateContent={onUpdateContent}
        onDeleteCell={onDeleteCell}
        onAddCell={onAddCell}
        comments={comments}
        onToggleComments={onToggleComments}
        onAddComment={onAddComment}
      />
    );
  }
};

export default Cell;
