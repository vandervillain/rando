import React from 'react'

type DragbarProps = {
  className: string
  /** in percent, ie, 0.25 */
  initialValue: number
  onChange: (p: number) => void
}

const Dragbar = ({ className, initialValue, onChange }: DragbarProps) => {
  const getClassName = () => `dragbar ${className}`

  return (
    <div className={getClassName()}>
      <input type='range' min='0' max='100' value={initialValue * 100} className='slider' onChange={(e) => onChange(parseInt(e.currentTarget.value) / 100)} />
    </div>
  )
}
export default Dragbar
