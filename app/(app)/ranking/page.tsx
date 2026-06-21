import { requireUser } from '@/lib/auth';
import { getRanking } from '@/lib/queries/ranking';
import { Card, CardBody } from '@/components/ui/card';
import { Podium } from '@/components/ranking/podium';
import { RankingList } from '@/components/ranking/ranking-list';

export default async function RankingPage() {
  const user = await requireUser();
  const { top, myPosition, me } = await getRanking(50);
  const top3 = top.slice(0, 3);
  const rest = top.slice(3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-text-primary">Ranking</h1>
        <p className="text-body text-text-secondary mt-1">
          Os colaboradores que mais engajam com as redes do SEBRAE Goiás.
        </p>
      </div>
      {me && myPosition > 0 && (
        <Card className="bg-state-info/5 border-state-info/30">
          <CardBody className="flex items-center justify-between">
            <p className="text-body-sm text-text-secondary">Sua posição atual</p>
            <p className="text-h2 font-bold tabular-nums text-text-primary">
              {myPosition}º · {me.total_points} pontos
            </p>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardBody>
          <Podium top3={top3} />
        </CardBody>
      </Card>
      <RankingList rows={rest} highlightUserId={user.id} myPosition={myPosition} />
    </div>
  );
}
