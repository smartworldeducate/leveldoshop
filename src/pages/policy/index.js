import React, { useEffect, useState } from "react";
import PageGuard from '../../components/PageGuard'
import { useRouter } from "next/router";
import policy from "../../assets/fake-data/policy";
import PolicyAccordion from "../../components/PolicyAccordion";

const PolicyPage = () => {
  const router = useRouter();
  const { tab } = router.query;

  const DEFAULT_TAB = "overview";
  const [activeId, setActiveId] = useState(DEFAULT_TAB);

  // 🔑 Open accordion based on URL
  useEffect(() => {
    if (!tab) {
      setActiveId(DEFAULT_TAB);
      return;
    }

    const isValidTab = policy.some(item => item.id === tab);
    setActiveId(isValidTab ? tab : DEFAULT_TAB);
  }, [tab]);

  // 🔁 Handle accordion click + URL sync
  const handleToggle = (id) => {
    const newTab = activeId === id ? DEFAULT_TAB : id;
    setActiveId(newTab);

    router.push(
      `/policy?tab=${newTab}`,
      undefined,
      { shallow: true }
    );
  };

  return (
    <div className="policy-page">
      <h1>Store Policies</h1>

      {policy.map(item => (
        <PolicyAccordion
          key={item.id}
          item={item}
          isOpen={activeId === item.id}
          onToggle={() => handleToggle(item.id)}
        />
      ))}
    </div>
  );
};

// Switched off from the dashboard? Show a notice instead of the page.
export default function GuardedPolicyPage(props) {
  return (
    <PageGuard page="policy" title="Our policies">
      <PolicyPage {...props} />
    </PageGuard>
  )
}
