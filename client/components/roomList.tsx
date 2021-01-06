import { CSSProperties } from "react"

type RoomListProps = {
  currRoom: string | null
  joinRoom: (r: string) => void
}

const rooms = ['Room 1', 'Room 2', 'Room 3']

const RoomList = ({ currRoom, joinRoom }: RoomListProps) => {

  const getBold: any = (room: string) => {
    if (room == currRoom) return {
      fontWeight: 'bold'
    } as CSSProperties
    else return null
  }

  return (
    <div className="room-list">
      {rooms &&
        rooms.map((r) => {
          return (
            <div key={r} style={getBold(r)} onClick={() => joinRoom(r)}>
              {r}
            </div>
          )
        })}
    </div>
  )
}

export default RoomList
