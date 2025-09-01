import classNames from 'classnames';

export default function GenresChips({ genres, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((g) => (
        <button
          key={g}
          type="button"
          className={classNames('btn btn-sm', selected === g ? 'btn-accent' : 'btn-outline')}
          aria-pressed={selected === g}
          onClick={() => onSelect(selected === g ? null : g)}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
