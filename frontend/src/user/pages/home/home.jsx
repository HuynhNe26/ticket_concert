import { useTranslation } from 'react-i18next';

export default function HomeUser() {
    const { t } = useTranslation();
    
    return (
        <div>
            <h1>{t('welcome')}</h1>
            <h2>{t('popular_events')}</h2>
            <h1>Ticket Concert</h1>
        </div>
    );
}