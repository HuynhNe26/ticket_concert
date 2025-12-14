import { useAdminAuth } from "../../../context/authAdmin"
import LoadingAdmin from "../../../components/loading/loading"

export default function AdminProfile() {
    const {admin} = useAdminAuth()

    return (
        <div>{admin.admin_id}</div>
    )
}